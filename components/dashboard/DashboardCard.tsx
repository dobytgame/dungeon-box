import type { ReactNode } from 'react';

type Accent = 'ember' | 'frost' | 'gold' | 'none';

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  accent?: Accent;
}

const accentBorder = {
  ember: 'border-l-ember',
  frost: 'border-l-frost',
  gold: 'border-l-gold',
  none: 'border-l-white/20',
};

const accentGlow = {
  ember: 'from-ember/10',
  frost: 'from-frost/10',
  gold: 'from-gold/10',
  none: 'from-white/[0.03]',
};

export default function DashboardCard({
  title,
  description,
  children,
  className = '',
  action,
  accent = 'ember',
}: Props) {
  return (
    <section
      className={`relative overflow-hidden rounded-sm border border-white/[0.06] bg-stone-950/40 ${className}`}
    >
      <div
        className={`border-l-4 ${accentBorder[accent]} bg-gradient-to-r ${accentGlow[accent]} to-transparent px-5 py-5 md:px-6 md:py-6`}
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl uppercase tracking-wide text-white md:text-2xl">
              {title}
            </h2>
            {description ? (
              <p className="mt-2 text-sm leading-relaxed text-stone-400">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}
