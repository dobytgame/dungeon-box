'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import AdminSection from '@/components/admin/AdminSection';
import type { ProductionCycleNavItem } from '@/lib/admin/production-cycle-nav';
import { productionCycleLabel } from '@/lib/admin/production-cycle-nav';

interface Props {
  cycles: ProductionCycleNavItem[];
  selectedCycle: number;
}

function buildCycleHref(
  pathname: string,
  searchParams: URLSearchParams,
  cycleNumber: number
) {
  const params = new URLSearchParams(searchParams.toString());
  params.delete('month');
  params.set('ciclo', String(cycleNumber));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function ProductionCycleNav({ cycles, selectedCycle }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedLabel = productionCycleLabel(selectedCycle);

  return (
    <AdminSection title="Ciclos de produção">
      <div className="admin-panel overflow-hidden rounded">
        <div className="border-b border-zinc-800/90 px-4 py-3 md:px-5">
          <p className="text-sm text-zinc-500">
            Cada aba é o kit daquele ciclo (1ª caixa, 2ª, 3ª…). Só entra quem
            pagou ou já tem o kit do combo prepaid ligado a este ciclo. A ordem
            na fila é a data do pagamento — renovação, combo ou primeira compra.
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-console/80">
            Produção de {selectedLabel}
          </p>
        </div>

        <div className="overflow-x-auto p-3">
          <div className="flex min-w-max gap-2">
            {cycles.map((cycle) => {
              const active = cycle.cycleNumber === selectedCycle;

              return (
                <Link
                  key={cycle.cycleNumber}
                  href={buildCycleHref(pathname, searchParams, cycle.cycleNumber)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-w-[112px] flex-col rounded border px-3 py-2.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console ${
                    active
                      ? 'border-console/40 bg-console/15 text-console'
                      : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em]">
                    {cycle.label}
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${
                        active ? 'bg-console/20 text-console' : 'bg-zinc-900 text-zinc-500'
                      }`}
                    >
                      {cycle.count}
                    </span>
                    {cycle.hasOpenWork ? (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-console/70">
                        Fila
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
