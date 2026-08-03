import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSiteUrl } from '@/lib/email/config';
import { sendCardMigrationEmail } from '@/lib/email/card-migration';
import { isAsaasSubscriptionNeedingPagarmeMigration } from '@/lib/pagarme/complete-asaas-migration';

export async function sendMigrationEmailForSubscription(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<{ sent: true; email: string } | { error: string }> {
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
      error: 'Assinatura não elegível para e-mail de migração (já no Pagar.me ou inativa).',
    };
  }

  const profile = Array.isArray(subscription.profiles)
    ? subscription.profiles[0]
    : subscription.profiles;

  if (!profile?.email) {
    return { error: 'Cliente sem e-mail cadastrado.' };
  }

  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const now = new Date().toISOString();

  const { error: logError } = await admin.from('gateway_migration_log').insert({
    subscription_id: subscription.id,
    user_id: subscription.user_id,
    gateway_from: 'asaas',
    gateway_to: 'pagarme',
    update_token: token,
    token_expires_at: expiresAt.toISOString(),
    status: 'sent',
    email_sent_at: now,
  });

  if (logError) {
    console.error('[gateway-migration] admin send log:', logError.message);
    return { error: 'Não foi possível registrar o envio do e-mail.' };
  }

  await admin
    .from('subscriptions')
    .update({ update_requested_at: now })
    .eq('id', subscription.id);

  try {
    await sendCardMigrationEmail({
      to: profile.email,
      name: profile.full_name,
      updateLink: `${getSiteUrl()}/atualizar-pagamento?token=${token}`,
      billingDate:
        subscription.next_billing_date ?? expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[gateway-migration] admin send email:', error);
    return {
      error:
        'Não foi possível enviar o e-mail. Verifique a configuração do Resend.',
    };
  }

  return { sent: true, email: profile.email };
}
