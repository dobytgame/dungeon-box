import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSiteUrl } from '@/lib/email/config';
import { sendCardMigrationEmail } from '@/lib/email/card-migration';
import { isAsaasSubscriptionNeedingPagarmeMigration } from '@/lib/pagarme/complete-asaas-migration';

export type MigrationLinkResult = {
  updateLink: string;
  token: string;
  expiresAt: string;
  email: string;
  customerName: string | null;
  reused: boolean;
};

type MigrationSubscriptionRow = {
  id: string;
  user_id: string;
  status: string;
  next_billing_date: string | null;
  asaas_subscription_id: string | null;
  pagarme_subscription_id: string | null;
  migrated_to_pagarme_at: string | null;
  profiles:
    | { email: string | null; full_name: string | null }
    | { email: string | null; full_name: string | null }[]
    | null;
};

async function loadMigrationSubscription(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<
  | { subscription: MigrationSubscriptionRow; profile: { email: string; full_name: string | null } }
  | { error: string }
> {
  const { data: subscription } = await admin
    .from('subscriptions')
    .select(
      `
      id,
      user_id,
      status,
      next_billing_date,
      asaas_subscription_id,
      pagarme_subscription_id,
      migrated_to_pagarme_at,
      profiles!inner(email, full_name)
    `
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) {
    return { error: 'Assinatura não encontrada.' };
  }

  if (!isAsaasSubscriptionNeedingPagarmeMigration(subscription)) {
    return {
      error:
        'Assinatura não elegível para migração (já no Pagar.me ou inativa).',
    };
  }

  const profile = Array.isArray(subscription.profiles)
    ? subscription.profiles[0]
    : subscription.profiles;

  if (!profile?.email) {
    return { error: 'Cliente sem e-mail cadastrado.' };
  }

  return {
    subscription: subscription as MigrationSubscriptionRow,
    profile: { email: profile.email, full_name: profile.full_name },
  };
}

function buildUpdateLink(token: string): string {
  return `${getSiteUrl()}/atualizar-pagamento?token=${token}`;
}

/**
 * Cria (ou reusa) um link válido de atualização de cartão Asaas → Pagar.me.
 */
export async function createOrReuseMigrationUpdateLink(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<MigrationLinkResult | { error: string }> {
  const loaded = await loadMigrationSubscription(admin, subscriptionId);
  if ('error' in loaded) return loaded;

  const { subscription, profile } = loaded;
  const now = new Date();

  const { data: existing } = await admin
    .from('gateway_migration_log')
    .select('update_token, token_expires_at')
    .eq('subscription_id', subscription.id)
    .eq('status', 'sent')
    .not('update_token', 'is', null)
    .gt('token_expires_at', now.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.update_token) {
    return {
      updateLink: buildUpdateLink(existing.update_token),
      token: existing.update_token,
      expiresAt: existing.token_expires_at ?? now.toISOString(),
      email: profile.email,
      customerName: profile.full_name,
      reused: true,
    };
  }

  const token = randomUUID();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 7);
  const nowIso = now.toISOString();

  const { error: logError } = await admin.from('gateway_migration_log').insert({
    subscription_id: subscription.id,
    user_id: subscription.user_id,
    gateway_from: 'asaas',
    gateway_to: 'pagarme',
    update_token: token,
    token_expires_at: expiresAt.toISOString(),
    status: 'sent',
    email_sent_at: null,
  });

  if (logError) {
    console.error('[gateway-migration] create link log:', logError.message);
    return { error: 'Não foi possível gerar o link de atualização.' };
  }

  await admin
    .from('subscriptions')
    .update({ update_requested_at: nowIso })
    .eq('id', subscription.id);

  return {
    updateLink: buildUpdateLink(token),
    token,
    expiresAt: expiresAt.toISOString(),
    email: profile.email,
    customerName: profile.full_name,
    reused: false,
  };
}

export async function sendMigrationEmailForSubscription(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<{ sent: true; email: string; updateLink: string } | { error: string }> {
  const link = await createOrReuseMigrationUpdateLink(admin, subscriptionId);
  if ('error' in link) return link;

  const loaded = await loadMigrationSubscription(admin, subscriptionId);
  if ('error' in loaded) return loaded;

  const { subscription, profile } = loaded;
  const nowIso = new Date().toISOString();

  try {
    await sendCardMigrationEmail({
      to: profile.email,
      name: profile.full_name,
      updateLink: link.updateLink,
      billingDate:
        subscription.next_billing_date ?? link.expiresAt,
    });
  } catch (error) {
    console.error('[gateway-migration] send email:', error);
    return {
      error:
        'Não foi possível enviar o e-mail. Verifique a configuração do Resend.',
    };
  }

  await admin
    .from('gateway_migration_log')
    .update({ email_sent_at: nowIso })
    .eq('update_token', link.token)
    .eq('status', 'sent');

  await admin
    .from('subscriptions')
    .update({ update_requested_at: nowIso })
    .eq('id', subscription.id);

  return { sent: true, email: profile.email, updateLink: link.updateLink };
}
