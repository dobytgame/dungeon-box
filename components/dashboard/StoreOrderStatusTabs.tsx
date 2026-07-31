import Link from 'next/link';
import {
  DASHBOARD_STORE_ORDER_TAB_STATUSES,
  type DashboardStoreOrderStatusCounts,
} from '@/lib/dashboard/store-orders';
import { DASHBOARD_ROUTES } from '@/lib/dashboard/routes';

interface Props {
  currentStatus: string;
  counts: DashboardStoreOrderStatusCounts;
  q?: string;
  shipping?: string;
}

function tabHref(tabValue: string, q?: string, shipping?: string): string {
  const params = new URLSearchParams();
  if (tabValue !== 'all') {
    params.set('status', tabValue);
  }
  if (q?.trim()) {
    params.set('q', q.trim());
  }
  if (shipping) {
    params.set('shipping', shipping);
  }
  const query = params.toString();
  return query ? `${DASHBOARD_ROUTES.orders}?${query}` : DASHBOARD_ROUTES.orders;
}

export default function StoreOrderStatusTabs({
  currentStatus,
  counts,
  q,
  shipping,
}: Props) {
  return (
    <nav
      className="flex flex-wrap gap-2"
      aria-label="Filtrar pedidos por status"
    >
      {DASHBOARD_STORE_ORDER_TAB_STATUSES.map((tab) => {
        const active = currentStatus === tab.value;
        const count = counts[tab.value as keyof DashboardStoreOrderStatusCounts] ?? 0;

        return (
          <Link
            key={tab.value}
            href={tabHref(tab.value, q, shipping)}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-sm border px-3 py-2 font-display text-[0.65rem] uppercase tracking-[0.16em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${
              active
                ? 'border-ember/40 bg-ember/10 text-ember'
                : 'border-white/10 text-stone-500 hover:border-white/20 hover:text-stone-300'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-sm px-1.5 py-0.5 text-[10px] tabular-nums ${
                active ? 'bg-ember/15 text-ember' : 'bg-stone-900 text-stone-500'
              }`}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
