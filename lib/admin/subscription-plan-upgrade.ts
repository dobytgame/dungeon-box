import type { SupabaseClient } from '@supabase/supabase-js';
import { relOne } from '@/lib/dashboard/format';

export type SubscriptionPlanUpgradeInfo = {
  hasAppliedUpgrade: boolean;
  hasPendingUpgrade: boolean;
  fromPlanName: string | null;
  toPlanName: string | null;
  pendingPlanName: string | null;
};

function emptyUpgradeInfo(): SubscriptionPlanUpgradeInfo {
  return {
    hasAppliedUpgrade: false,
    hasPendingUpgrade: false,
    fromPlanName: null,
    toPlanName: null,
    pendingPlanName: null,
  };
}

export async function loadSubscriptionPlanUpgradeInfoByIds(
  admin: SupabaseClient,
  subscriptionIds: string[]
): Promise<Map<string, SubscriptionPlanUpgradeInfo>> {
  const result = new Map<string, SubscriptionPlanUpgradeInfo>();
  if (subscriptionIds.length === 0) return result;

  for (const id of subscriptionIds) {
    result.set(id, emptyUpgradeInfo());
  }

  const { data: pendingRows, error: pendingError } = await admin
    .from('subscriptions')
    .select('id, pending_plan_id, pending_plan:plans!pending_plan_id(name)')
    .in('id', subscriptionIds)
    .not('pending_plan_id', 'is', null);

  if (pendingError) {
    console.error('[admin] load pending plan upgrades:', pendingError.message);
  } else {
    for (const row of pendingRows ?? []) {
      const current = result.get(row.id as string) ?? emptyUpgradeInfo();
      current.hasPendingUpgrade = true;
      current.pendingPlanName =
        relOne(
          row.pending_plan as { name: string } | { name: string }[] | null
        )?.name ?? null;
      result.set(row.id as string, current);
    }
  }

  const { data: appliedRows, error: appliedError } = await admin
    .from('subscription_plan_changes')
    .select(
      `
      subscription_id,
      from_plan_id,
      to_plan_id,
      metadata,
      created_at,
      from_plan:plans!from_plan_id(name),
      to_plan:plans!to_plan_id(name)
    `
    )
    .in('subscription_id', subscriptionIds)
    .eq('event', 'applied')
    .order('created_at', { ascending: false });

  if (appliedError) {
    console.error('[admin] load applied plan upgrades:', appliedError.message);
    return result;
  }

  for (const row of appliedRows ?? []) {
    const subscriptionId = row.subscription_id as string;
    const metadata = (row.metadata as Record<string, unknown> | null) ?? {};
    if (metadata.type === 'combo_upgrade') continue;

    const fromPlanId = row.from_plan_id as string | null;
    const toPlanId = row.to_plan_id as string | null;
    if (!fromPlanId || !toPlanId || fromPlanId === toPlanId) continue;

    const current = result.get(subscriptionId) ?? emptyUpgradeInfo();
    if (current.hasAppliedUpgrade) continue;

    current.hasAppliedUpgrade = true;
    current.fromPlanName =
      relOne(row.from_plan as { name: string } | { name: string }[] | null)
        ?.name ?? null;
    current.toPlanName =
      relOne(row.to_plan as { name: string } | { name: string }[] | null)
        ?.name ?? null;
    result.set(subscriptionId, current);
  }

  return result;
}

export function subscriptionShowsPlanUpgradeTag(
  info: SubscriptionPlanUpgradeInfo | null | undefined
): boolean {
  if (!info) return false;
  return info.hasAppliedUpgrade || info.hasPendingUpgrade;
}

export function subscriptionPlanUpgradeTitle(
  info: SubscriptionPlanUpgradeInfo | null | undefined
): string | undefined {
  if (!info) return undefined;

  if (info.hasPendingUpgrade && info.pendingPlanName) {
    return `Upgrade agendado para ${info.pendingPlanName}`;
  }

  if (
    info.hasAppliedUpgrade &&
    info.fromPlanName &&
    info.toPlanName &&
    info.fromPlanName !== info.toPlanName
  ) {
    return `${info.fromPlanName} → ${info.toPlanName}`;
  }

  if (info.hasAppliedUpgrade) return 'Plano alterado por upgrade';
  return undefined;
}
