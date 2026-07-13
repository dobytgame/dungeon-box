import type { SupabaseClient } from '@supabase/supabase-js';
import { relOne } from '@/lib/dashboard/format';
import { sendFeedbackRequestEmail } from '@/lib/email/send-transactional';
import { getUserEmailProfile } from '@/lib/email/user-context';

export async function sendFeedbackRequestForCycle(
  supabase: SupabaseClient,
  input: {
    cycleId: string;
    userId: string;
    cycleNumber: number;
    themeName?: string | null;
  },
  options?: { resend?: boolean }
): Promise<{ sent: boolean; reason?: string }> {
  const profile = await getUserEmailProfile(supabase, input.userId);
  if (!profile?.email) {
    return { sent: false, reason: 'missing_email' };
  }

  const result = await sendFeedbackRequestEmail(profile.email, {
    name: profile.name,
    cycleNumber: input.cycleNumber,
    themeName: input.themeName,
    cycleId: input.cycleId,
  });

  if (!result.sent) {
    return { sent: false, reason: result.reason };
  }

  await markFeedbackRequestSent(supabase, input.cycleId, Boolean(options?.resend));

  return { sent: true };
}

async function markFeedbackRequestSent(
  supabase: SupabaseClient,
  cycleId: string,
  resend: boolean
): Promise<void> {
  let query = supabase
    .from('subscription_cycles')
    .update({ feedback_request_sent_at: new Date().toISOString() })
    .eq('id', cycleId);

  if (!resend) {
    query = query.is('feedback_request_sent_at', null);
  }

  const { error } = await query;
  if (error) {
    console.warn('[feedback] feedback_request_sent_at update failed:', error.message);
  }
}

export async function sendFeedbackRequestFromCycleRecord(
  supabase: SupabaseClient,
  cycle: {
    id: string;
    cycle_number: number;
    themes?: { name?: string } | { name?: string }[] | null;
    subscriptions?:
      | { user_id?: string }
      | { user_id?: string }[]
      | null;
  },
  options?: { resend?: boolean }
): Promise<{ sent: boolean; reason?: string }> {
  const subscription = relOne(cycle.subscriptions);
  const theme = relOne(cycle.themes);
  const userId = subscription?.user_id;

  if (!userId) {
    return { sent: false, reason: 'missing_user' };
  }

  return sendFeedbackRequestForCycle(
    supabase,
    {
      cycleId: cycle.id,
      userId,
      cycleNumber: cycle.cycle_number,
      themeName: theme?.name ?? null,
    },
    options
  );
}

const FOLLOW_UP_DAYS = 3;

export async function sendPendingFeedbackRequestEmails(
  supabase: SupabaseClient
): Promise<{ scanned: number; sent: number; skipped: number }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - FOLLOW_UP_DAYS);
  const cutoffIso = cutoff.toISOString();

  const { data: cycles, error } = await supabase
    .from('subscription_cycles')
    .select(
      `
      id,
      cycle_number,
      delivered_at,
      themes(name),
      subscriptions!inner(user_id),
      user_feedback(id)
    `
    )
    .eq('status', 'delivered')
    .is('feedback_request_sent_at', null)
    .lte('delivered_at', cutoffIso)
    .order('delivered_at', { ascending: true })
    .limit(100);

  if (error) {
    console.error('[feedback] pending query failed:', error.message);
    return { scanned: 0, sent: 0, skipped: 0 };
  }

  let sent = 0;
  let skipped = 0;

  for (const cycle of cycles ?? []) {
    const feedback = Array.isArray(cycle.user_feedback)
      ? cycle.user_feedback[0]
      : cycle.user_feedback;

    if (feedback) {
      skipped += 1;
      continue;
    }

    const result = await sendFeedbackRequestFromCycleRecord(supabase, {
      id: cycle.id as string,
      cycle_number: cycle.cycle_number as number,
      themes: cycle.themes,
      subscriptions: cycle.subscriptions,
    });

    if (result.sent) {
      sent += 1;
    } else {
      skipped += 1;
    }
  }

  return { scanned: cycles?.length ?? 0, sent, skipped };
}
