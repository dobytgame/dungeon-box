import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSiteUrl } from '@/lib/email/config';
import { sendCardMigrationEmail } from '@/lib/email/card-migration';

export async function processWeeklyMigrationEmails(
  admin: SupabaseClient
): Promise<{ sent: number }> {
  const today = new Date();
  const in7days = new Date(today);
  in7days.setDate(today.getDate() + 7);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const { data: candidates } = await admin
    .from('subscriptions')
    .select(
      `
      id,
      user_id,
      next_billing_date,
      update_requested_at,
      profiles!inner(email, full_name)
    `
    )
    .eq('status', 'active')
    .not('asaas_subscription_id', 'is', null)
    .is('pagarme_subscription_id', null)
    .is('migrated_to_pagarme_at', null)
    .eq('billing_term', 'monthly')
    .lte('next_billing_date', in7days.toISOString())
    .or(
      `update_requested_at.is.null,update_requested_at.lt.${sevenDaysAgo.toISOString()}`
    );

  let sent = 0;

  for (const sub of candidates ?? []) {
    const profile = Array.isArray(sub.profiles) ? sub.profiles[0] : sub.profiles;
    if (!profile?.email) continue;

    const token = randomUUID();
    const expiresAt = new Date(today);
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: logError } = await admin.from('gateway_migration_log').insert({
      subscription_id: sub.id,
      user_id: sub.user_id,
      gateway_from: 'asaas',
      gateway_to: 'pagarme',
      update_token: token,
      token_expires_at: expiresAt.toISOString(),
      status: 'sent',
      email_sent_at: new Date().toISOString(),
    });

    if (logError) {
      console.error('[gateway-migration] log insert failed:', sub.id, logError.message);
      continue;
    }

    await admin
      .from('subscriptions')
      .update({ update_requested_at: new Date().toISOString() })
      .eq('id', sub.id);

    try {
      await sendCardMigrationEmail({
        to: profile.email,
        name: profile.full_name,
        updateLink: `${getSiteUrl()}/atualizar-pagamento?token=${token}`,
        billingDate: sub.next_billing_date ?? in7days.toISOString(),
      });
      sent += 1;
    } catch (error) {
      console.error('[gateway-migration] email failed:', sub.id, error);
    }
  }

  return { sent };
}
