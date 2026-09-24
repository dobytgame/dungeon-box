import type { SupabaseClient } from '@supabase/supabase-js';
import {
  UGC_REWARD_BONUS_NOTE,
  UGC_REWARD_ELIGIBLE_STATUSES,
} from '@/lib/ugc/constants';

export function mergeBonusNotes(existing: string | null | undefined, note: string): string {
  const current = existing?.trim() ?? '';
  if (!current) return note;
  if (current.includes(note)) return current;
  return `${current} · ${note}`;
}

export function stripBonusNote(
  existing: string | null | undefined,
  note: string
): string | null {
  if (!existing?.trim()) return null;
  const parts = existing
    .split(' · ')
    .map((part) => part.trim())
    .filter((part) => part && part !== note);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export async function userHasQueuedUgcReward(
  admin: SupabaseClient,
  userId: string,
  exceptSubmissionId?: string
): Promise<boolean> {
  let query = admin
    .from('ugc_submissions')
    .select('id')
    .eq('user_id', userId)
    .eq('reward_status', 'queued')
    .limit(1);

  if (exceptSubmissionId) {
    query = query.neq('id', exceptSubmissionId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('[ugc] userHasQueuedUgcReward:', error.message);
    return true;
  }
  return Boolean(data);
}

export async function findRewardEligibleCycle(
  admin: SupabaseClient,
  userId: string
): Promise<{ id: string; bonusNotes: string | null; cycleNumber: number } | null> {
  const { data: subscription, error: subError } = await admin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError) {
    console.error('[ugc] findRewardEligibleCycle subscription:', subError.message);
    return null;
  }

  if (!subscription) return null;

  const { data: cycle, error: cycleError } = await admin
    .from('subscription_cycles')
    .select('id, bonus_notes, cycle_number')
    .eq('subscription_id', subscription.id)
    .in('status', [...UGC_REWARD_ELIGIBLE_STATUSES])
    .order('cycle_number', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (cycleError) {
    console.error('[ugc] findRewardEligibleCycle cycle:', cycleError.message);
    return null;
  }

  if (!cycle) return null;

  return {
    id: cycle.id as string,
    bonusNotes: (cycle.bonus_notes as string | null) ?? null,
    cycleNumber: Number(cycle.cycle_number),
  };
}

export async function queueUgcRewardOnCycle(
  admin: SupabaseClient,
  input: { submissionId: string; userId: string }
): Promise<
  | { queued: true; cycleId: string; cycleNumber: number }
  | { queued: false; reason: 'already_queued' | 'no_cycle' }
> {
  const alreadyQueued = await userHasQueuedUgcReward(
    admin,
    input.userId,
    input.submissionId
  );
  if (alreadyQueued) {
    return { queued: false, reason: 'already_queued' };
  }

  const cycle = await findRewardEligibleCycle(admin, input.userId);
  if (!cycle) {
    return { queued: false, reason: 'no_cycle' };
  }

  const nextNotes = mergeBonusNotes(cycle.bonusNotes, UGC_REWARD_BONUS_NOTE);
  const { error } = await admin
    .from('subscription_cycles')
    .update({ bonus_notes: nextNotes })
    .eq('id', cycle.id);

  if (error) {
    console.error('[ugc] queueUgcRewardOnCycle:', error.message);
    return { queued: false, reason: 'no_cycle' };
  }

  const { error: updateError } = await admin
    .from('ugc_submissions')
    .update({
      reward_status: 'queued',
      reward_cycle_id: cycle.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.submissionId);

  if (updateError) {
    console.error('[ugc] queueUgcRewardOnCycle submission:', updateError.message);
  }

  return { queued: true, cycleId: cycle.id, cycleNumber: cycle.cycleNumber };
}

export async function clearQueuedUgcReward(
  admin: SupabaseClient,
  input: { submissionId: string; cycleId: string | null }
): Promise<void> {
  if (input.cycleId) {
    const { data: cycle } = await admin
      .from('subscription_cycles')
      .select('bonus_notes')
      .eq('id', input.cycleId)
      .maybeSingle();

    if (cycle) {
      const nextNotes = stripBonusNote(
        (cycle.bonus_notes as string | null) ?? null,
        UGC_REWARD_BONUS_NOTE
      );
      const { error } = await admin
        .from('subscription_cycles')
        .update({ bonus_notes: nextNotes })
        .eq('id', input.cycleId);

      if (error) {
        console.error('[ugc] clearQueuedUgcReward cycle:', error.message);
      }
    }
  }

  const { error } = await admin
    .from('ugc_submissions')
    .update({
      reward_status: 'none',
      reward_cycle_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.submissionId);

  if (error) {
    console.error('[ugc] clearQueuedUgcReward submission:', error.message);
  }
}

export async function markUgcRewardsSentForCycle(
  admin: SupabaseClient,
  cycleId: string
): Promise<number> {
  const { data, error } = await admin
    .from('ugc_submissions')
    .update({
      reward_status: 'sent',
      updated_at: new Date().toISOString(),
    })
    .eq('reward_cycle_id', cycleId)
    .eq('reward_status', 'queued')
    .select('id');

  if (error) {
    console.error('[ugc] markUgcRewardsSentForCycle:', error.message);
    return 0;
  }

  return data?.length ?? 0;
}
