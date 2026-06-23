import type { SupabaseClient } from '@supabase/supabase-js';
import { relOne } from '@/lib/dashboard/format';
import type { CycleStatus } from '@/lib/dashboard/types';
import { sendCycleStatusUpdateEmail } from '@/lib/email/send-transactional';
import { getUserEmailProfile } from '@/lib/email/user-context';

const NOTIFY_STATUSES = new Set<CycleStatus>([
  'production',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
]);

export async function notifyCycleStatusChange(
  supabase: SupabaseClient,
  input: {
    userId: string;
    cycleNumber: number;
    planName?: string | null;
    themeName?: string | null;
    status: CycleStatus;
    trackingCode?: string | null;
    carrier?: string | null;
    estimatedDelivery?: string | null;
    cancelReason?: string | null;
  }
): Promise<void> {
  if (!NOTIFY_STATUSES.has(input.status)) return;

  if (input.status === 'shipped' && !input.trackingCode?.trim()) {
    return;
  }

  const profile = await getUserEmailProfile(supabase, input.userId);
  if (!profile?.email) return;

  await sendCycleStatusUpdateEmail(profile.email, {
    name: profile.name,
    cycleNumber: input.cycleNumber,
    planName: input.planName,
    themeName: input.themeName,
    status: input.status,
    trackingCode: input.trackingCode,
    carrier: input.carrier,
    estimatedDelivery: input.estimatedDelivery,
    cancelReason: input.cancelReason,
  });
}

export async function notifyCycleStatusFromRecord(
  supabase: SupabaseClient,
  cycle: {
    cycle_number: number;
    status: CycleStatus;
    tracking_code?: string | null;
    carrier?: string | null;
    estimated_delivery?: string | null;
    cancel_reason?: string | null;
    themes?: { name?: string } | { name?: string }[] | null;
    subscriptions?:
      | {
          user_id?: string;
          plans?: { name?: string } | { name?: string }[] | null;
        }
      | {
          user_id?: string;
          plans?: { name?: string } | { name?: string }[] | null;
        }[]
      | null;
  }
): Promise<void> {
  const subscription = relOne(cycle.subscriptions);
  const plan = relOne(subscription?.plans);
  const theme = relOne(cycle.themes);
  const userId = subscription?.user_id;

  if (!userId) return;

  await notifyCycleStatusChange(supabase, {
    userId,
    cycleNumber: cycle.cycle_number,
    planName: plan?.name ?? null,
    themeName: theme?.name ?? null,
    status: cycle.status,
    trackingCode: cycle.tracking_code,
    carrier: cycle.carrier,
    estimatedDelivery: cycle.estimated_delivery ?? null,
    cancelReason: cycle.cancel_reason ?? null,
  });
}
