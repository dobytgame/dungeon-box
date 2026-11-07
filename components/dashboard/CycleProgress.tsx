import { formatCycleStatus } from '@/lib/dashboard/format';
import { dashboardCycleStatusCopy } from '@/lib/dashboard/cycle-status';
import { PRODUCTION_PIPELINE } from '@/lib/subscriptions/cycle-production';
import type { CycleStatus } from '@/lib/dashboard/types';

interface Props {
  status: CycleStatus;
  showCopy?: boolean;
}

const SHORT_STEP: Record<CycleStatus, string> = {
  upcoming: 'Aguard.',
  production: 'Prod.',
  preparing: 'Preparo',
  packed: 'Embalado',
  awaiting_pickup: 'Coleta',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: '—',
  failed: '—',
};

export default function CycleProgress({ status, showCopy = false }: Props) {
  const currentIndex = PRODUCTION_PIPELINE.indexOf(status);
  if (currentIndex < 0) return null;

  const copy = dashboardCycleStatusCopy(status);
  const progressPct = Math.round(((currentIndex + 1) / PRODUCTION_PIPELINE.length) * 100);
  const stepLabel = formatCycleStatus(status);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="home-v2-display text-[11px] tracking-[0.14em] text-mesa-ember">
          {stepLabel}
        </p>
        <p className="text-xs tabular-nums text-mesa-ash">
          Etapa {currentIndex + 1} de {PRODUCTION_PIPELINE.length}
        </p>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Andamento da entrega: ${stepLabel}`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-mesa-jade/80 to-mesa-ember/90 transition-[width] duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <ol className="flex items-start justify-between gap-0.5" aria-hidden="true">
        {PRODUCTION_PIPELINE.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;

          return (
            <li key={step} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span
                className={`block h-2 w-2 shrink-0 rounded-full transition-colors ${
                  active
                    ? 'bg-mesa-ember shadow-[0_0_10px_rgba(255,107,53,0.55)]'
                    : done
                      ? 'bg-mesa-jade/80'
                      : 'bg-white/20'
                }`}
              />
              <span
                className={`hidden max-w-[3.25rem] truncate text-center text-[9px] leading-tight tracking-wide sm:block ${
                  active ? 'text-mesa-ember' : done ? 'text-mesa-jade/80' : 'text-mesa-ash/70'
                }`}
              >
                {SHORT_STEP[step]}
              </span>
            </li>
          );
        })}
      </ol>

      {showCopy ? (
        <p className="text-sm leading-relaxed text-mesa-ash">
          {copy.summary}
          {copy.next ? ` ${copy.next}` : ''}
        </p>
      ) : null}
    </div>
  );
}
