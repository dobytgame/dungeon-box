import type { CycleStatus } from '@/lib/dashboard/types';
import { formatCycleStatus } from '@/lib/dashboard/format';
import {
  PRODUCTION_PIPELINE,
  pipelineStepIndex,
} from '@/lib/subscriptions/cycle-production';

interface Props {
  status: CycleStatus;
}

export default function ProductionPipeline({ status }: Props) {
  const currentIndex = pipelineStepIndex(status);
  const isTerminal = status === 'cancelled' || status === 'failed';

  return (
    <div className="admin-panel rounded p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        Fluxo de produção
      </p>
      {isTerminal ? (
        <p className="mt-3 text-sm text-zinc-400">
          Status atual:{' '}
          <span className="font-medium text-zinc-200">{formatCycleStatus(status)}</span>
          {status === 'cancelled'
            ? ' — pedido fora da fila operacional.'
            : ' — aguardando regularização de pagamento.'}
        </p>
      ) : (
        <ol className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
          {PRODUCTION_PIPELINE.map((step, index) => {
            const done = currentIndex > index;
            const current = currentIndex === index;

            return (
              <li key={step} className="flex flex-1 items-center gap-2 sm:flex-col sm:gap-2">
                <div className="flex w-full items-center gap-2 sm:flex-col">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs ${
                      current
                        ? 'border-console bg-console/15 text-console'
                        : done
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          : 'border-zinc-800 text-zinc-600'
                    }`}
                  >
                    {done ? '✓' : index + 1}
                  </span>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.14em] sm:text-center ${
                      current ? 'text-console' : done ? 'text-emerald-400/90' : 'text-zinc-600'
                    }`}
                  >
                    {formatCycleStatus(step)}
                  </span>
                </div>
                {index < PRODUCTION_PIPELINE.length - 1 ? (
                  <span
                    className="hidden h-px flex-1 bg-zinc-800 sm:block"
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
