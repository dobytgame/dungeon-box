import type { ReactNode } from 'react';

type Accent = 'ember' | 'jade' | 'frost' | 'gold' | 'none';

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  accent?: Accent;
  /** Iguala altura em grids de colunas (ex.: resumo da home). */
  fillHeight?: boolean;
}

const accentBar = {
  ember: 'bg-mesa-ember',
  jade: 'bg-mesa-jade',
  frost: 'bg-mesa-jade',
  gold: 'bg-gold',
  none: 'bg-white/15',
};

export default function DashboardCard({
  title,
  description,
  children,
  className = '',
  action,
  accent = 'ember',
  fillHeight = false,
}: Props) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-mesa-stone ${
        fillHeight ? 'flex h-full flex-col' : ''
      } ${className}`}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${accentBar[accent]}`} aria-hidden="true" />
      <div
        className={`px-5 py-5 md:px-6 md:py-6 ${fillHeight ? 'flex flex-1 flex-col' : ''}`}
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="home-v2-display text-2xl leading-none text-mesa-parchment">{title}</h2>
            {description ? (
              <p className="mt-2 text-sm leading-relaxed text-mesa-ash">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
        {fillHeight ? (
          <div className="flex flex-1 flex-col">{children}</div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
