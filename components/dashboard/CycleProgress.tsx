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
              className={`rounded-sm border px-2.5 py-1 home-v2-display text-[11px] tracking-[0.14em] ${
                active
                  ? 'border-mesa-ember/50 bg-mesa-ember/10 text-mesa-ember'
                  : done
                    ? 'border-mesa-jade/30 bg-mesa-jade/10 text-mesa-jade'
                    : 'border-white/10 text-mesa-ash'
              }`}
            >
              {formatCycleStatus(step)}
            </li>
          );
        })}
      </ol>
      {showCopy ? (
        <p className="mt-3 text-sm leading-relaxed text-mesa-ash">
          {copy.summary}
          {copy.next ? ` ${copy.next}` : ''}
        </p>
      ) : null}
    </div>
  );
}
