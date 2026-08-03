import { createAdminClient } from '@/lib/supabase/admin';

export type MigrationPreview =
  | {
      ok: true;
      token: string;
      customerName: string | null;
      customerEmail: string;
      planName: string;
      planSlug: string | null;
      priceCents: number;
      shippingCents: number;
      totalCents: number;
      nextBillingDate: string | null;
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

  if (!plan?.name || plan.price_cents == null) {
    return {
      ok: false,
      reason: 'incomplete',
      message: 'Plano da assinatura não encontrado.',
    };
  }

  const shippingCents = subscription.shipping_cents ?? 0;

  return {
    ok: true,
    token: updateToken,
    customerName: profile.full_name,
    customerEmail: profile.email,
    planName: plan.name,
    planSlug: plan.slug ?? null,
    priceCents: plan.price_cents,
    shippingCents,
    totalCents: plan.price_cents + shippingCents,
    nextBillingDate: subscription.next_billing_date,
    billingTerm: subscription.billing_term,
    subscriptionStatus: subscription.status,
  };
}
