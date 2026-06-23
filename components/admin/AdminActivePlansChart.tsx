'use client';

interface PlanRow {
  planName: string;
  planSlug: string;
  subscribers: number;
}

interface Props {
  plans: PlanRow[];
  totalActive: number;
}

export default function AdminActivePlansChart({ plans, totalActive }: Props) {
  const maxCount = Math.max(...plans.map((row) => row.subscribers), 1);

  return (
    <div className="admin-panel rounded p-5 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Assinaturas ativas
          </p>
          <h3 className="mt-2 text-lg font-medium text-zinc-100">
            Planos assinados
          </h3>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-500">
            Quantidade de assinantes com status{' '}
            <span className="text-console">active</span> em cada plano no momento.
          </p>
        </div>
        <p className="font-mono text-3xl tabular-nums text-console">{totalActive}</p>
      </div>

      {plans.length === 0 ? (
        <p className="mt-6 font-mono text-xs text-zinc-600">
          Nenhuma assinatura ativa no momento.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {plans.map((row) => {
            const pct =
              totalActive > 0
                ? Math.round((row.subscribers / totalActive) * 100)
                : 0;
            const barPct = (row.subscribers / maxCount) * 100;

            return (
              <div key={row.planSlug}>
                <div className="mb-1.5 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{row.planName}</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                      {row.planSlug}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xl tabular-nums text-zinc-100">
                      {row.subscribers}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-600">{pct}%</p>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                  <div
                    className="h-full rounded-full bg-console transition-all"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
