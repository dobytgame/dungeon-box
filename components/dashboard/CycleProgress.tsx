import { formatCycleStatus } from '@/lib/dashboard/format';
import { dashboardCycleStatusCopy } from '@/lib/dashboard/cycle-status';
import { PRODUCTION_PIPELINE } from '@/lib/subscriptions/cycle-production';
import type { CycleStatus } from '@/lib/dashboard/types';

interface Props {
  status: CycleStatus;
  showCopy?: boolean;
}

export default function CycleProgress({ status, showCopy = false }: Props) {
  const currentIndex = PRODUCTION_PIPELINE.indexOf(status);
  if (currentIndex < 0) return null;

  const copy = dashboardCycleStatusCopy(status);

  return (
    <div>
      <ol className="flex flex-wrap gap-2">
        {PRODUCTION_PIPELINE.map((step, index) => {
          const done = index <= currentIndex;
          const active = index === currentIndex;

          return (
            <li
              key={step}
              className={`rounded-sm border px-2.5 py-1 font-display text-[0.6rem] uppercase tracking-[0.14em] ${
                active
                  ? 'border-ember/40 bg-ember/10 text-ember'
                  : done
                    ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
                    : 'border-white/5 text-stone-600'
              }`}
            >
              {formatCycleStatus(step)}
            </li>
          );
        })}
      </ol>
      {showCopy ? (
        <p className="mt-3 text-sm leading-relaxed text-stone-400">
          {copy.summary}
          {copy.next ? ` ${copy.next}` : ''}
        </p>
      ) : null}
    </div>
  );
}
