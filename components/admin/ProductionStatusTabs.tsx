import Link from 'next/link';
import {
  PRODUCTION_TAB_STATUSES,
} from '@/lib/subscriptions/cycle-production';
import type { CycleStatusCounts } from '@/lib/admin/queries';

interface Props {
  currentStatus: string;
  counts: CycleStatusCounts;
  currentView?: 'kanban' | 'list';
}

function tabHref(
  tabValue: string,
  currentView?: 'kanban' | 'list'
): string {
  const params = new URLSearchParams();
  if (tabValue !== 'preparing') {
    params.set('status', tabValue);
  }
  if (currentView === 'list') {
    params.set('view', 'list');
  }
  const query = params.toString();
  if (tabValue === 'preparing' && !query) return '/admin/ciclos';
  if (tabValue === 'preparing') return `/admin/ciclos?${query}`;
  return `/admin/ciclos?${query}`;
}

export default function ProductionStatusTabs({
  currentStatus,
  counts,
  currentView,
}: Props) {
  return (
    <nav
      className="admin-panel flex flex-wrap gap-2 rounded p-2"
      aria-label="Filas de produção"
    >
      {PRODUCTION_TAB_STATUSES.map((tab) => {
        const active = currentStatus === tab.value;
        const count =
          tab.value === 'all' ? counts.all : counts[tab.value as keyof CycleStatusCounts];

        return (
          <Link
            key={tab.value}
            href={tabHref(tab.value, currentView)}
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
