import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { findPointsExpiringForWarning, expireDuePoints } from '@/lib/referral/points';
import { sendPointsExpiringEmail } from '@/lib/referral/notify';
import { REFERRAL_EXPIRY_WARNING_DAYS } from '@/lib/referral/constants';

export async function processPointsExpiration(
  supabase: SupabaseClient = createAdminClient()
): Promise<{ expiredLots: number; warningsSent: number }> {
  const expiredLots = await expireDuePoints(supabase);

  const expiring = await findPointsExpiringForWarning(
    supabase,
    REFERRAL_EXPIRY_WARNING_DAYS
  );

  let warningsSent = 0;

  for (const item of expiring) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, display_name')
      .eq('id', item.userId)
      .maybeSingle();

    if (!profile?.email) continue;

    try {
      await sendPointsExpiringEmail({
        to: profile.email,
        name: profile.display_name || profile.full_name,
        points: item.points,
        expiresAt: item.expiresAt,
      });
      warningsSent += 1;
    } catch (error) {
      console.error('[referral] expiry warning email failed:', error);
    }
  }

  return { expiredLots, warningsSent };
}
