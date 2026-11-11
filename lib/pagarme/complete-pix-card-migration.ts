import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanSlug } from '@/lib/checkout/plans';
import { PAGARME_CONFIGURED } from '@/lib/pagarme/client';
import { buildBillingAddress } from '@/lib/pagarme/subscription-checkout';
import { userFacingPagarmeError } from '@/lib/pagarme/errors';
import { attachPagarmeSubscriptionToExisting } from '@/lib/pagarme/migrate-subscription';
import { migrationNeedsImmediateCharge } from '@/lib/pagarme/migration-schedule';
import { resolveSubscriptionRecurringCharge } from '@/lib/subscriptions/recurring-charge';
import {
  isPixSubscriptionNeedingCardMigrationSync,
  subscriptionHasPixPayment,
} from '@/lib/subscriptions/pix-recurring';

export async function isPixSubscriptionNeedingCardMigration(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<boolean> {
  const { data: subscription } = await admin
    .from('subscriptions')
    .select(
      `
      id,
      status,
      is_partner,
      billing_term,
      prepaid_until,
      asaas_subscription_id,
      pagarme_subscription_id,
      stripe_subscription_id,
      mp_subscription_id,
      migrated_to_pagarme_at
    `
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) return false;
  const hasPix = await subscriptionHasPixPayment(admin, subscriptionId);
  return isPixSubscriptionNeedingCardMigrationSync(subscription, hasPix);
}

/**
 * Assinatura mensal em PIX (sem recorrência no gateway): cadastra cartão no Pagar.me
 * e agenda as próximas cobranças automáticas.
 */
export async function completePixToPagarmeCardMigration(input: {
  admin: SupabaseClient;
  subscriptionId: string;
  userId: string;
  cardToken: string;
  cardLast4: string;
  cardBrand: string;
  migrationLogId?: string | null;
}): Promise<
  | {
      success: true;
      pagarmeSubscriptionId: string;
      subscriptionId: string;
      chargedImmediately: boolean;
      amountChargedCents: number | null;
      nextBillingDate: string;
    }
  | { error: string; status?: number }
> {
  if (!PAGARME_CONFIGURED) {
    return { error: 'Cadastro de cartão indisponível no momento.', status: 503 };
  }

  const hasPix = await subscriptionHasPixPayment(input.admin, input.subscriptionId);

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
      billing_term,
      prepaid_until,
      is_partner,
      asaas_subscription_id,
      pagarme_subscription_id,
      stripe_subscription_id,
      mp_subscription_id,
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

  if (!isPixSubscriptionNeedingCardMigrationSync(subscription, hasPix)) {
    return {
      error:
        'Esta assinatura já tem cartão recorrente ou não está no PIX mensal.',
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
    return { error: 'Complete e-mail e endereço no perfil antes de continuar.', status: 422 };
  }

  const cpf = profile.cpf?.replace(/\D/g, '') ?? '';
  if (cpf.length !== 11) {
    return {
      error: 'CPF obrigatório. Atualize seu perfil antes de cadastrar o cartão.',
      status: 422,
    };
  }

  const charge = await resolveSubscriptionRecurringCharge(input.admin, planData, {
    promo_code: subscription.promo_code,
    shipping_cents: subscription.shipping_cents,
    special_notes: subscription.special_notes,
  });

  const chargeImmediately = migrationNeedsImmediateCharge({
    status: subscription.status,
    nextBillingDate: subscription.next_billing_date,
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
      chargeImmediately,
      subscriptionStatus: subscription.status,
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

    const nowIso = now.toISOString();
    if (input.migrationLogId) {
      await input.admin
        .from('gateway_migration_log')
        .update({
          status: 'updated',
          card_updated_at: nowIso,
        })
        .eq('id', input.migrationLogId);
    } else {
      await input.admin.from('gateway_migration_log').insert({
        subscription_id: subscription.id,
        user_id: input.userId,
        gateway_from: 'pix',
        gateway_to: 'pagarme',
        status: 'updated',
        card_updated_at: nowIso,
        email_sent_at: null,
      });
    }

    return {
      success: true,
      subscriptionId: subscription.id,
      pagarmeSubscriptionId: result.pagarmeSubscriptionId,
      chargedImmediately: result.chargedImmediately,
      amountChargedCents: result.amountChargedCents,
      nextBillingDate: result.nextBillingDate,
    };
  } catch (error) {
    console.error('[migrate-pix-card]', error);
    return { error: userFacingPagarmeError(error), status: 502 };
  }
}
