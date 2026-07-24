import type { SubscriptionPlanUpgradeInfo } from '@/lib/admin/subscription-plan-upgrade';
import {
  subscriptionPlanUpgradeTitle,
  subscriptionShowsPlanUpgradeTag,
} from '@/lib/admin/subscription-plan-upgrade';

export default function PlanUpgradeBadge({
  upgrade,
  compact = false,
}: {
  upgrade: SubscriptionPlanUpgradeInfo | null | undefined;
  compact?: boolean;
}) {
  if (!subscriptionShowsPlanUpgradeTag(upgrade)) return null;

  const label = upgrade?.hasPendingUpgrade ? 'Upgrade agendado' : 'Upgrade';
  const title = subscriptionPlanUpgradeTitle(upgrade);

  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-sm border border-sky-400/30 bg-sky-500/10 font-mono uppercase tracking-wider text-sky-200 ${
        compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
      }`}
    >
      {label}
    </span>
  );
}
