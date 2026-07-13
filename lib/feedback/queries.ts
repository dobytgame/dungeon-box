import type { SupabaseClient } from '@supabase/supabase-js';
import { relOne } from '@/lib/dashboard/format';
import type { SubscriptionCycle } from '@/lib/dashboard/types';
import type { FeedbackCycleOption } from '@/lib/feedback/types';

export async function getFeedbackCyclesForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<FeedbackCycleOption[]> {
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId);

  if (!subs?.length) return [];

  const subIds = subs.map((s) => s.id);

  const [{ data: cycles }, { data: feedbackRows }] = await Promise.all([
    supabase
      .from('subscription_cycles')
      .select('id, cycle_number, status, delivered_at, themes(name, emoji)')
      .in('subscription_id', subIds)
      .eq('status', 'delivered')
      .order('cycle_number', { ascending: false }),
    supabase
      .from('user_feedback')
      .select('subscription_cycle_id')
      .eq('user_id', userId),
  ]);

  const feedbackCycleIds = new Set(
    (feedbackRows ?? []).map((row) => row.subscription_cycle_id as string)
  );

  return (cycles ?? []).map((cycle) => {
    const theme = relOne(cycle.themes as SubscriptionCycle['themes']);
    return {
      id: cycle.id as string,
      cycleNumber: cycle.cycle_number as number,
      themeName: theme?.name ?? null,
      themeEmoji: theme?.emoji ?? null,
      deliveredAt: (cycle.delivered_at as string | null) ?? null,
      hasFeedback: feedbackCycleIds.has(cycle.id as string),
    };
  });
}

export async function userOwnsDeliveredCycle(
  supabase: SupabaseClient,
  userId: string,
  cycleId: string
): Promise<boolean> {
  const { data: cycle } = await supabase
    .from('subscription_cycles')
    .select('id, status, subscriptions!inner(user_id)')
    .eq('id', cycleId)
    .maybeSingle();

  if (!cycle || cycle.status !== 'delivered') return false;

  const subscription = relOne(
    cycle.subscriptions as { user_id: string } | { user_id: string }[] | null
  );

  return subscription?.user_id === userId;
}
