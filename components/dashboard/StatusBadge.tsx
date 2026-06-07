import type { CycleStatus, PaymentStatus, SubscriptionStatus } from '@/lib/dashboard/types';
import {
  formatCycleStatus,
  formatPaymentStatus,
  formatSubscriptionStatus,
} from '@/lib/dashboard/format';

type Kind = 'subscription' | 'cycle' | 'payment';

const styles: Record<string, string> = {
  active: 'text-emerald-300',
  approved: 'text-emerald-300',
  delivered: 'text-emerald-300',
  pending: 'text-amber-300',
  upcoming: 'text-frost',
  preparing: 'text-frost',
  shipped: 'text-violet-300',
  paused: 'text-stone-400',
  past_due: 'text-red-300',
  cancelled: 'text-stone-500',
  expired: 'text-stone-500',
  failed: 'text-red-300',
  rejected: 'text-red-300',
  refunded: 'text-orange-300',
  charged_back: 'text-red-300',
  authorized: 'text-sky-300',
  in_process: 'text-amber-300',
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
      className={`inline-flex items-center gap-2 font-display text-xs uppercase tracking-[0.2em] ${styles[status] ?? 'text-stone-400'}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${status === 'active' || status === 'approved' ? 'shadow-[0_0_8px_currentColor]' : ''}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
