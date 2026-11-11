import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSiteUrl } from '@/lib/email/config';
import { sendPixCardMigrationEmail } from '@/lib/email/pix-card-migration';
import { isPixSubscriptionNeedingCardMigration } from '@/lib/pagarme/complete-pix-card-migration';

export type PixCardMigrationLinkResult = {
  updateLink: string;
  token: string;
  expiresAt: string;
  email: string;
  customerName: string | null;
  reused: boolean;
};

function buildUpdateLink(token: string): string {
  return `${getSiteUrl()}/atualizar-pagamento?token=${token}`;
}

export async function createOrReusePixCardMigrationLink(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<PixCardMigrationLinkResult | { error: string }> {
  const eligible = await isPixSubscriptionNeedingCardMigration(admin, subscriptionId);
  if (!eligible) {
    return {
      error:
        'Assinatura não elegível (já tem cartão recorrente, combo pré-pago ou sem histórico PIX).',
    };
  }

  const { data: subscription } = await admin
    .from('subscriptions')
    .select(
      `
      id,
      user_id,
      next_billing_date,
      profiles!inner(email, full_name)
    `
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) return { error: 'Assinatura não encontrada.' };

  const profile = Array.isArray(subscription.profiles)
    ? subscription.profiles[0]
    : subscription.profiles;

  if (!profile?.email) {
    return { error: 'Cliente sem e-mail cadastrado.' };
  }

  const now = new Date();

  const { data: existing } = await admin
    .from('gateway_migration_log')
    .select('update_token, token_expires_at')
    .eq('subscription_id', subscriptionId)
    .eq('gateway_from', 'pix')
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
    gateway_from: 'pix',
    gateway_to: 'pagarme',
    update_token: token,
    token_expires_at: expiresAt.toISOString(),
    status: 'sent',
    email_sent_at: null,
    notes: 'pix_manual_to_card',
  });

  if (logError) {
    console.error('[pix-card-migration] create link:', logError.message);
    return { error: 'Não foi possível gerar o link.' };
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

export async function sendPixCardMigrationEmailForSubscription(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<{ sent: true; email: string; updateLink: string } | { error: string }> {
  const link = await createOrReusePixCardMigrationLink(admin, subscriptionId);
  if ('error' in link) return link;

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('next_billing_date, profiles!inner(full_name)')
    .eq('id', subscriptionId)
    .maybeSingle();

  const profile = Array.isArray(subscription?.profiles)
    ? subscription?.profiles[0]
    : subscription?.profiles;

  const nowIso = new Date().toISOString();

  try {
    await sendPixCardMigrationEmail({
      to: link.email,
      name: profile?.full_name ?? link.customerName,
      updateLink: link.updateLink,
      billingDate: subscription?.next_billing_date ?? link.expiresAt,
    });
  } catch (error) {
    console.error('[pix-card-migration] send email:', error);
    return {
      error: 'Não foi possível enviar o e-mail. Verifique a configuração do Resend.',
    };
  }

  await admin
    .from('gateway_migration_log')
    .update({ email_sent_at: nowIso })
    .eq('update_token', link.token)
    .eq('status', 'sent');

  return { sent: true, email: link.email, updateLink: link.updateLink };
}
