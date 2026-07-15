import Link from 'next/link';
import {
  STORE_ORDER_TAB_STATUSES,
  type AdminStoreOrderStatusCounts,
} from '@/lib/admin/store-orders';

interface Props {
  currentStatus: string;
  counts: AdminStoreOrderStatusCounts;
  q?: string;
  shipping?: string;
}

function tabHref(
  tabValue: string,
  q?: string,
  shipping?: string
): string {
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
  return query ? `/admin/loja/pedidos?${query}` : '/admin/loja/pedidos';
}

export default function StoreOrderStatusTabs({
  currentStatus,
  counts,
  q,
  shipping,
}: Props) {
  return (
    <nav
      className="admin-panel flex flex-wrap gap-2 rounded p-2"
      aria-label="Filas de pedidos da loja"
    >
      {STORE_ORDER_TAB_STATUSES.map((tab) => {
        const active = currentStatus === tab.value;
        const count = counts[tab.value as keyof AdminStoreOrderStatusCounts] ?? 0;

        return (
          <Link
            key={tab.value}
            href={tabHref(tab.value, q, shipping)}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console ${
              active
                ? 'border-console/40 bg-console/15 text-console'
                : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums ${
                active ? 'bg-console/20 text-console' : 'bg-zinc-900 text-zinc-500'
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
