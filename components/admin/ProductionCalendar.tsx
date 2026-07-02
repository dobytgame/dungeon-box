'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import AdminSection from '@/components/admin/AdminSection';
import { monthKeyFromDate } from '@/lib/admin/chart-period';
import type { ProductionMonthNavItem } from '@/lib/admin/production-month';
import { productionMonthLabel } from '@/lib/admin/production-month';

interface Props {
  months: ProductionMonthNavItem[];
  selectedMonth: string;
}

function buildMonthHref(
  pathname: string,
  searchParams: URLSearchParams,
  monthKey: string
) {
  const params = new URLSearchParams(searchParams.toString());
  params.set('month', monthKey);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function ProductionCalendar({ months, selectedMonth }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentMonthKey = monthKeyFromDate(new Date());
  const selectedLabel = productionMonthLabel(selectedMonth);

  return (
    <AdminSection title="Calendário de produção">
      <div className="admin-panel overflow-hidden rounded">
        <div className="border-b border-zinc-800/90 px-4 py-3 md:px-5">
          <p className="text-sm text-zinc-500">
            Selecione o mês para carregar os pedidos no kanban abaixo. Combos
            aparecem mês a mês (1 kit por mês). Pedidos de jun/2026 entram em
            jul/2026.
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-console/80">
            Produção de {selectedLabel}
          </p>
        </div>

        <div className="overflow-x-auto p-3">
          <div className="flex min-w-max gap-2">
            {months.map((month) => {
              const active = month.monthKey === selectedMonth;
              const isCurrent = month.monthKey === currentMonthKey;

              return (
                <Link
                  key={month.monthKey}
                  href={buildMonthHref(pathname, searchParams, month.monthKey)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-w-[112px] flex-col rounded border px-3 py-2.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console ${
                    active
                      ? 'border-console/40 bg-console/15 text-console'
                      : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em]">
                    {month.label}
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${
                        active ? 'bg-console/20 text-console' : 'bg-zinc-900 text-zinc-500'
                      }`}
                    >
                      {month.count}
                    </span>
                    {isCurrent ? (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-console/70">
                        Atual
                      </span>
                    ) : month.isFuture ? (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-600">
                        Futuro
                      </span>
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AdminSection>
  );
}
