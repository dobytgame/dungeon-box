'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutGrid, List } from 'lucide-react';

export type ProductionViewMode = 'kanban' | 'list';

interface Props {
  current: ProductionViewMode;
  disabled?: boolean;
}

function buildHref(
  pathname: string,
  searchParams: URLSearchParams,
  view: ProductionViewMode
) {
  const params = new URLSearchParams(searchParams.toString());
  if (view === 'kanban') {
    params.delete('view');
  } else {
    params.set('view', view);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function ProductionViewToggle({ current, disabled }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const options: Array<{
    value: ProductionViewMode;
    label: string;
    icon: typeof LayoutGrid;
  }> = [
    { value: 'kanban', label: 'Kanban', icon: LayoutGrid },
    { value: 'list', label: 'Lista', icon: List },
  ];

  return (
    <div
      className="inline-flex rounded border border-zinc-800 bg-zinc-950/80 p-1"
      role="group"
      aria-label="Modo de visualização da produção"
    >
      {options.map((option) => {
        const active = current === option.value;
        const Icon = option.icon;

        return (
          <Link
            key={option.value}
            href={buildHref(pathname, searchParams, option.value)}
            aria-current={active ? 'true' : undefined}
            className={`inline-flex min-h-[40px] min-w-[104px] cursor-pointer items-center justify-center gap-2 rounded px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console ${
              disabled
                ? 'pointer-events-none opacity-40'
                : active
                  ? 'bg-console/15 text-console shadow-[inset_0_0_0_1px_rgba(56,189,248,0.25)]'
                  : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
