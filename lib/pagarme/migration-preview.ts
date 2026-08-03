import { createAdminClient } from '@/lib/supabase/admin';
import {
  migrationNeedsImmediateCharge,
  resolveMigrationCatchUpStartAt,
  resolveMigrationStartAt,
} from '@/lib/pagarme/migration-schedule';
import { resolveSubscriptionRecurringCharge } from '@/lib/subscriptions/recurring-charge';

export type MigrationPreview =
  | {
      ok: true;
      token: string;
      customerName: string | null;
      customerEmail: string;
      planName: string;
      planSlug: string | null;
      priceCents: number;
      originalPriceCents: number;
      shippingCents: number;
      originalShippingCents: number;
      bumpCents: number;
      totalCents: number;
      originalTotalCents: number;
      promoCode: string | null;
      promoSummary: string | null;
      /** Data vencida / atual no Asaas (pode estar no passado se em atraso). */
      nextBillingDate: string | null;
      /** Data em que a renovação será agendada no Pagar.me. */
      scheduledBillingDate: string;
      chargeImmediately: boolean;
      billingTerm: string | null;
      subscriptionStatus: string;
    }
  | {
      ok: false;
      reason: 'missing' | 'invalid' | 'expired' | 'already_updated' | 'incomplete';
      message: string;
    };

export async function loadMigrationPreviewByToken(
  token: string | null | undefined
): Promise<MigrationPreview> {
  const updateToken = token?.trim() ?? '';
  if (!updateToken) {
    return {
      ok: false,
      reason: 'missing',
      message: 'Link inválido. Solicite um novo e-mail de atualização.',
    };
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: migration } = await admin
    .from('gateway_migration_log')
    .select(
      'id, subscription_id, user_id, status, token_expires_at, card_updated_at'
    )
    .eq('update_token', updateToken)
    .maybeSingle();

  if (!migration) {
    return {
      ok: false,
      reason: 'invalid',
      message: 'Link inválido ou já utilizado. Solicite um novo e-mail.',
    };
  }

  if (migration.status === 'updated' || migration.card_updated_at) {
    return {
      ok: false,
      reason: 'already_updated',
      message:
        'Este cartão já foi atualizado. Sua assinatura já está na nova plataforma.',
    };
  }

  if (migration.status === 'expired') {
    return {
      ok: false,
      reason: 'expired',
      message: 'Este link expirou. Solicite um novo e-mail de atualização.',
    };
  }

  if (
    migration.token_expires_at &&
    new Date(migration.token_expires_at) < now
  ) {
    await admin
      .from('gateway_migration_log')
      .update({ status: 'expired' })
      .eq('id', migration.id);

    return {
      ok: false,
      reason: 'expired',
      message: 'Este link expirou. Solicite um novo e-mail de atualização.',
    };
  }

  if (migration.status !== 'sent') {
    return {
      ok: false,
      reason: 'invalid',
      message: 'Link inválido. Solicite um novo e-mail de atualização.',
    };
  }

  const { data: subscription } = await admin
    .from('subscriptions')
    .select(
      `
      id,
      status,
      billing_term,
      next_billing_date,
      shipping_cents,
      promo_code,
      special_notes,
      pagarme_subscription_id,
      migrated_to_pagarme_at,
      plans!plan_id(name, slug, price_cents)
    `
    )
    .eq('id', migration.subscription_id)
    .eq('user_id', migration.user_id)
    .maybeSingle();

  if (!subscription) {
    return {
      ok: false,
      reason: 'incomplete',
      message: 'Assinatura não encontrada para este link.',
    };
  }

  if (subscription.pagarme_subscription_id || subscription.migrated_to_pagarme_at) {
    return {
      ok: false,
      reason: 'already_updated',
      message:
        'Sua assinatura já está no Pagar.me. Não é necessário atualizar novamente.',
    };
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('id', migration.user_id)
    .maybeSingle();

  if (!profile?.email) {
    return {
      ok: false,
      reason: 'incomplete',
      message: 'Dados do cliente incompletos. Contate o suporte.',
    };
  }

  const plan = Array.isArray(subscription.plans)
    ? subscription.plans[0]
    : subscription.plans;

  if (!plan?.name || !plan.slug || plan.price_cents == null) {
    return {
      ok: false,
      reason: 'incomplete',
      message: 'Plano da assinatura não encontrado.',
    };
  }

  const billingContext = {
    promo_code: subscription.promo_code,
    shipping_cents: subscription.shipping_cents,
    special_notes: subscription.special_notes,
  };

  const [charge, fullCharge] = await Promise.all([
    resolveSubscriptionRecurringCharge(admin, plan, billingContext),
    resolveSubscriptionRecurringCharge(admin, plan, {
      ...billingContext,
      promo_code: null,
    }),
  ]);

  const chargeImmediately = migrationNeedsImmediateCharge({
    status: subscription.status,
    nextBillingDate: subscription.next_billing_date,
  });

  const scheduledBillingDate = (
    chargeImmediately
      ? resolveMigrationCatchUpStartAt(subscription.next_billing_date)
      : resolveMigrationStartAt(subscription.next_billing_date)
  ).toISOString();

  return {
    ok: true,
    token: updateToken,
    customerName: profile.full_name,
    customerEmail: profile.email,
    planName: plan.name,
    planSlug: plan.slug,
    priceCents: charge.planCents,
    originalPriceCents: fullCharge.planCents,
    shippingCents: charge.shippingCents,
    originalShippingCents: fullCharge.shippingCents,
    bumpCents: charge.bumpCents,
    totalCents: charge.totalCents,
    originalTotalCents: fullCharge.totalCents,
    promoCode: subscription.promo_code?.trim() || null,
    promoSummary: charge.promoSummary,
    nextBillingDate: subscription.next_billing_date,
    scheduledBillingDate,
    chargeImmediately,
    billingTerm: subscription.billing_term,
    subscriptionStatus: subscription.status,
  };
}
