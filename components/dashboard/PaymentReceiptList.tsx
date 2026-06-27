import Link from 'next/link';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { formatDateTime, formatMoney } from '@/lib/dashboard/format';
import type { Payment, PaymentStatus } from '@/lib/dashboard/types';
import { CreditCard } from 'lucide-react';

const RETRY_STATUSES = new Set<PaymentStatus>([
  'pending',
  'in_process',
  'rejected',
]);

interface Props {
  payments: Payment[];
}

export default function PaymentReceiptList({ payments }: Props) {
  return (
    <ul className="space-y-4">
      {payments.map((p) => (
        <li
          key={p.id}
          className="rounded-sm border border-white/[0.06] border-l-4 border-l-ember/50 bg-stone-950/40 p-5 transition hover:border-white/10"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-display text-2xl uppercase tracking-wide text-white">
                {formatMoney(p.amount_cents, p.currency ?? 'BRL')}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                {formatDateTime(p.paid_at ?? p.created_at)}
              </p>
            </div>
            <StatusBadge kind="payment" status={p.status} />
          </div>

          <dl className="mt-4 grid gap-2 border-t border-white/[0.04] pt-4 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2 text-stone-400">
              <CreditCard className="h-4 w-4 shrink-0 text-stone-600" aria-hidden="true" />
              <span>
                {p.card_brand && p.card_last4
                  ? `${p.card_brand} •••• ${p.card_last4}`
                  : p.payment_method ?? 'Cartão'}
                {p.installments && p.installments > 1 ? ` · ${p.installments}x` : ''}
              </span>
            </div>
            {p.status_detail ? (
              <div className="text-stone-500 sm:text-right">{p.status_detail}</div>
            ) : null}
          </dl>

          {RETRY_STATUSES.has(p.status) && p.subscription_id ? (
            <Link
              href="/dashboard/subscription"
              className="mt-4 inline-flex min-h-[44px] items-center font-display text-xs uppercase tracking-widest text-ember hover:text-ember-bright"
            >
              Regularizar pagamento →
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
