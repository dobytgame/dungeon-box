import type { SupabaseClient } from '@supabase/supabase-js';
import { sendOrderShippedEmail } from '@/lib/email/send-transactional';
import { getUserEmailProfile } from '@/lib/email/user-context';

export async function notifyOrderShipped(
  supabase: SupabaseClient,
  input: {
    userId: string;
    cycleNumber: number;
    trackingCode: string;
    carrier?: string | null;
    themeName?: string | null;
    estimatedDelivery?: string | null;
  },
): Promise<void> {
  const profile = await getUserEmailProfile(supabase, input.userId);
  if (!profile) return;

  await sendOrderShippedEmail(profile.email, {
    name: profile.name,
    cycleNumber: input.cycleNumber,
    trackingCode: input.trackingCode,
    carrier: input.carrier,
    themeName: input.themeName,
    estimatedDelivery: input.estimatedDelivery,
  });
}
