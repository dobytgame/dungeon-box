import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanSlug } from '@/lib/checkout/plans';
import { cancelAsaasSubscriptionBestEffort } from '@/lib/asaas/subscription-api';
import { attachPagarmeSubscriptionToExisting } from '@/lib/pagarme/migrate-subscription';
import { buildBillingAddress } from '@/lib/pagarme/subscription-checkout';
import { userFacingPagarmeError } from '@/lib/pagarme/errors';
import { PAGARME_CONFIGURED } from '@/lib/pagarme/client';
import { resolveSubscriptionRecurringCharge } from '@/lib/subscriptions/recurring-charge';

export function isAsaasSubscriptionNeedingPagarmeMigration(sub: {
  status?: string | null;
  asaas_subscription_id?: string | null;
  pagarme_subscription_id?: string | null;
  migrated_to_pagarme_at?: string | null;
}): boolean {
  if (!sub.asaas_subscription_id) return false;
  if (sub.pagarme_subscription_id) return false;
  if (sub.migrated_to_pagarme_at) return false;
  const status = sub.status ?? '';
  return status === 'active' || status === 'past_due' || status === 'paused';
}

/**
 * Migra uma assinatura Asaas → Pagar.me com cartão tokenizado.
 * Usado pela página pública (token) e pelo dashboard logado.
 */
export async function completeAsaasToPagarmeMigration(input: {
  admin: SupabaseClient;
  subscriptionId: string;
  userId: string;
  cardToken: string;
  cardLast4: string;
  cardBrand: string;
  migrationLogId?: string | null;
}): Promise<
  | { success: true; pagarmeSubscriptionId: string; subscriptionId: string }
  | { error: string; status?: number }
> {
  if (!PAGARME_CONFIGURED) {
    return { error: 'Migração de pagamento indisponível.', status: 503 };
  }

  const { data: subscription } = await input.admin
    .from('subscriptions')
    .select(
      `
      id,
      user_id,
      status,
      address_id,
      shipping_cents,
      promo_code,
      special_notes,
      next_billing_date,
      asaas_subscription_id,
      pagarme_subscription_id,
      migrated_to_pagarme_at,
      plans!plan_id(name, slug, price_cents)
    `
    )
    .eq('id', input.subscriptionId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (!subscription) {
    return { error: 'Assinatura não encontrada.', status: 404 };
  }

  if (!isAsaasSubscriptionNeedingPagarmeMigration(subscription)) {
    return {
      error:
        'Esta assinatura já está no Pagar.me ou não está elegível para migração.',
      status: 409,
    };
  }

  if (!subscription.address_id) {
    return { error: 'Assinatura sem endereço de entrega.', status: 422 };
  }

  const planData = Array.isArray(subscription.plans)
    ? subscription.plans[0]
    : subscription.plans;

  if (!planData?.slug) {
    return { error: 'Plano não encontrado.', status: 404 };
  }

  const { data: profile } = await input.admin
    .from('profiles')
    .select('id, email, full_name, cpf, phone, pagarme_customer_id')
    .eq('id', input.userId)
    .single();

  const { data: address } = await input.admin
    .from('addresses')
    .select(
      'recipient, zip_code, street, number, complement, neighborhood, city, state'
    )
    .eq('id', subscription.address_id)
    .maybeSingle();

  if (!profile?.email || !address) {
    return { error: 'Complete e-mail e endereço no perfil antes de migrar.', status: 422 };
  }

  const cpf = profile.cpf?.replace(/\D/g, '') ?? '';
  if (cpf.length !== 11) {
    return {
      error: 'CPF obrigatório. Atualize seu perfil antes de migrar o pagamento.',
      status: 422,
    };
  }

  const charge = await resolveSubscriptionRecurringCharge(input.admin, planData, {
    promo_code: subscription.promo_code,
    shipping_cents: subscription.shipping_cents,
    special_notes: subscription.special_notes,
  });

  const now = new Date();

  try {
    const result = await attachPagarmeSubscriptionToExisting({
      supabase: input.admin,
      subscriptionId: subscription.id,
      userId: input.userId,
      planSlug: planData.slug as PlanSlug,
      planName: planData.name,
      priceCents: charge.totalCents,
      cardToken: input.cardToken,
      cardLast4: input.cardLast4,
      cardBrand: input.cardBrand,
      billingAddress: buildBillingAddress(address),
      nextBillingDate: subscription.next_billing_date,
      profile: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        cpf: profile.cpf,
        phone: profile.phone,
        pagarme_customer_id: profile.pagarme_customer_id,
      },
      address,
    });

    if (subscription.asaas_subscription_id) {
      await cancelAsaasSubscriptionBestEffort(subscription.asaas_subscription_id);
    }

    await input.admin
      .from('subscriptions')
      .update({
        asaas_subscription_id: null,
        asaas_customer_id: null,
        updated_at: now.toISOString(),
      })
      .eq('id', subscription.id);

    if (input.migrationLogId) {
      await input.admin
        .from('gateway_migration_log')
        .update({
          status: 'updated',
          card_updated_at: now.toISOString(),
        })
        .eq('id', input.migrationLogId);
    } else {
      await input.admin.from('gateway_migration_log').insert({
        subscription_id: subscription.id,
        user_id: input.userId,
        gateway_from: 'asaas',
        gateway_to: 'pagarme',
        status: 'updated',
        card_updated_at: now.toISOString(),
        email_sent_at: null,
      });
    }

    return {
      success: true,
      subscriptionId: subscription.id,
      pagarmeSubscriptionId: result.pagarmeSubscriptionId,
    };
  } catch (error) {
    console.error('[migrate-asaas-pagarme]', error);
    return { error: userFacingPagarmeError(error), status: 502 };
  }
}
