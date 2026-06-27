import type { SupabaseClient } from '@supabase/supabase-js';
import { sendPendingPaymentEmail } from '@/lib/email/send-transactional';
import { getUserEmailProfile } from '@/lib/email/user-context';
import type { PendingPaymentLink } from '@/lib/payments/pending-payment-link';

export async function notifyPendingPaymentLink(
  supabase: SupabaseClient,
  input: {
    userId: string;
    planName?: string | null;
    link: PendingPaymentLink;
  }
): Promise<{ sent: boolean; reason?: string }> {
  const profile = await getUserEmailProfile(supabase, input.userId);
  if (!profile?.email) {
    return { sent: false, reason: 'missing_email' };
  }

  const result = await sendPendingPaymentEmail({
    to: profile.email,
    name: profile.name,
    planName: input.planName,
    amountCents: input.link.amountCents,
    paymentUrl: input.link.url,
    dueDate: input.link.dueDate,
  });

  if (!result.sent) {
    console.error('[email] pending payment link failed:', result);
    return { sent: false, reason: result.reason };
  }

  return { sent: true };
}
