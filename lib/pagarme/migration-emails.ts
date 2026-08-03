import type { SupabaseClient } from '@supabase/supabase-js';
import { sendMigrationEmailForSubscription } from '@/lib/pagarme/send-migration-email';

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
    .select('id')
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
    const result = await sendMigrationEmailForSubscription(admin, sub.id);
    if ('sent' in result) sent += 1;
  }

  return { sent };
}
