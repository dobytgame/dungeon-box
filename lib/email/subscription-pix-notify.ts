import type { SupabaseClient } from '@supabase/supabase-js';
import { sendSubscriptionPixPaymentEmail } from '@/lib/email/send-transactional';
import { getUserEmailProfile } from '@/lib/email/user-context';

export async function notifySubscriptionPixPayment(
  supabase: SupabaseClient,
  input: {
    userId: string;
    planName?: string | null;
    amountCents: number;
    paymentUrl: string;
    pixPayload: string;
    expirationDate?: string | null;
  }
): Promise<{ sent: boolean; reason?: string }> {
  const profile = await getUserEmailProfile(supabase, input.userId);
  if (!profile?.email) {
    return { sent: false, reason: 'missing_email' };
  }

  const result = await sendSubscriptionPixPaymentEmail({
    to: profile.email,
    name: profile.name,
    planName: input.planName,
    amountCents: input.amountCents,
    paymentUrl: input.paymentUrl,
    pixPayload: input.pixPayload,
    expirationDate: input.expirationDate,
  });

  if (!result.sent) {
    console.error('[email] subscription pix payment failed:', result);
    return { sent: false, reason: result.reason };
  }

  return { sent: true };
}
