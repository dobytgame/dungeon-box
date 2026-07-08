import type { SupabaseClient } from '@supabase/supabase-js';

export type PlanChangeEvent = 'scheduled' | 'applied' | 'cancelled';
export type PlanChangeActor = 'user' | 'admin' | 'system';

export type SubscriptionPlanChangeRow = {
  id: string;
  subscription_id: string;
  user_id: string;
  from_plan_id: string | null;
  to_plan_id: string | null;
  event: PlanChangeEvent;
  actor: PlanChangeActor;
  actor_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  from_plan?: { name: string; slug: string } | { name: string; slug: string }[] | null;
  to_plan?: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

export async function logSubscriptionPlanChange(
  supabase: SupabaseClient,
  input: {
    subscriptionId: string;
    userId: string;
    fromPlanId: string | null;
    toPlanId: string | null;
    event: PlanChangeEvent;
    actor: PlanChangeActor;
    actorId?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase.from('subscription_plan_changes').insert({
    subscription_id: input.subscriptionId,
    user_id: input.userId,
    from_plan_id: input.fromPlanId,
    to_plan_id: input.toPlanId,
    event: input.event,
    actor: input.actor,
    actor_id: input.actorId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error('[upgrade] plan change log failed:', error);
  }
}

export const PLAN_CHANGE_EVENT_LABELS: Record<PlanChangeEvent, string> = {
  scheduled: 'Upgrade agendado',
  applied: 'Upgrade efetivado',
  cancelled: 'Upgrade cancelado',
};

export const PLAN_CHANGE_ACTOR_LABELS: Record<PlanChangeActor, string> = {
  user: 'Cliente',
  admin: 'Admin',
  system: 'Sistema',
};
