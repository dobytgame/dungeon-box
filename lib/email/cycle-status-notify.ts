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
): Promise<{ sent: boolean; reason?: string }> {
  if (!NOTIFY_STATUSES.has(input.status)) {
    return { sent: false, reason: 'status_not_notifiable' };
  }

  if (input.status === 'shipped' && !input.trackingCode?.trim()) {
    return { sent: false, reason: 'missing_tracking_code' };
  }

  const profile = await getUserEmailProfile(supabase, input.userId);
  if (!profile?.email) {
    console.warn('[email] cycle status: cliente sem e-mail', input.userId);
    return { sent: false, reason: 'missing_email' };
  }

  const result = await sendCycleStatusUpdateEmail(profile.email, {
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

  if (!result.sent) {
    console.error('[email] cycle status failed:', input.status, result);
    return { sent: false, reason: result.reason };
  }

  return { sent: true };
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
  },
  options?: { status?: CycleStatus }
): Promise<{ sent: boolean; reason?: string }> {
  const subscription = relOne(cycle.subscriptions);
  const plan = relOne(subscription?.plans);
  const theme = relOne(cycle.themes);
  const userId = subscription?.user_id;
  const status = options?.status ?? cycle.status;

  if (!userId) {
    console.warn('[email] cycle status: ciclo sem user_id na assinatura');
    return { sent: false, reason: 'missing_user' };
  }

  return notifyCycleStatusChange(supabase, {
    userId,
    cycleNumber: cycle.cycle_number,
    planName: plan?.name ?? null,
    themeName: theme?.name ?? null,
    status,
    trackingCode: cycle.tracking_code,
    carrier: cycle.carrier,
    estimatedDelivery: cycle.estimated_delivery ?? null,
    cancelReason: cycle.cancel_reason ?? null,
  });
}
