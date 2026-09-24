import type { CycleStatus, PaymentStatus, SubscriptionStatus } from '@/lib/dashboard/types';
import {
  formatCycleStatus,
  formatPaymentStatus,
  formatSubscriptionStatus,
} from '@/lib/dashboard/format';

type Kind = 'subscription' | 'cycle' | 'payment';

const styles: Record<string, string> = {
  active: 'text-mesa-jade',
  approved: 'text-mesa-jade',
  delivered: 'text-mesa-jade',
  pending: 'text-mesa-parchment',
  upcoming: 'text-mesa-parchment',
  production: 'text-mesa-parchment',
  preparing: 'text-mesa-jade',
  packed: 'text-mesa-jade',
  awaiting_pickup: 'text-mesa-parchment',
  shipped: 'text-mesa-jade',
  paused: 'text-mesa-ash',
  past_due: 'text-mesa-ember',
  cancelled: 'text-mesa-ash',
  expired: 'text-mesa-ash',
  failed: 'text-mesa-ember',
  rejected: 'text-mesa-ember',
  refunded: 'text-mesa-ash',
  charged_back: 'text-mesa-ember',
  authorized: 'text-mesa-parchment',
  in_process: 'text-mesa-parchment',
};

interface Props {
  kind: Kind;
  status: SubscriptionStatus | CycleStatus | PaymentStatus;
}

export default function StatusBadge({ kind, status }: Props) {
  const label =
    kind === 'subscription'
      ? formatSubscriptionStatus(status as SubscriptionStatus)
      : kind === 'cycle'
        ? formatCycleStatus(status as CycleStatus)
        : formatPaymentStatus(status as PaymentStatus);

  return (
    <span
      className={`inline-flex items-center gap-2 home-v2-display text-[11px] tracking-[0.16em] ${styles[status] ?? 'text-mesa-ash'}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${status === 'active' || status === 'approved' ? 'shadow-[0_0_8px_currentColor]' : ''}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
