'use client';

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  withActivePlan: number;
  withoutActivePlan: number;
  totalProfiles: number;
}

function DonutChart({ segments, total }: { segments: Segment[]; total: number }) {
  const radius = 54;
  const stroke = 18;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg
      viewBox="0 0 140 140"
      className="h-36 w-36 shrink-0"
      role="img"
      aria-label="Gráfico de usuários com e sem plano ativo"
    >
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
      />
      {segments.map((segment) => {
        if (segment.value <= 0 || total <= 0) return null;
        const length = (segment.value / total) * circumference;
        const dasharray = `${length} ${circumference - length}`;
        const dashoffset = -offset;
        offset += length;

        return (
          <circle
            key={segment.label}
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={stroke}
            strokeDasharray={dasharray}
            strokeDashoffset={dashoffset}
            strokeLinecap="butt"
            transform="rotate(-90 70 70)"
          />
        );
      })}
      <text
        x="70"
        y="66"
        textAnchor="middle"
        className="fill-zinc-100 text-[22px] font-semibold"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        {total}
      </text>
      <text
        x="70"
        y="84"
        textAnchor="middle"
        className="fill-zinc-500 text-[9px] uppercase tracking-widest"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        usuários
      </text>
    </svg>
  );
}

export default function AdminUserPlanChart({
  withActivePlan,
  withoutActivePlan,
  totalProfiles,
}: Props) {
  const activePct =
    totalProfiles > 0 ? Math.round((withActivePlan / totalProfiles) * 100) : 0;
  const inactivePct = totalProfiles > 0 ? 100 - activePct : 0;

  const segments: Segment[] = [
    { label: 'Com plano', value: withActivePlan, color: '#22d3ee' },
    { label: 'Sem plano', value: withoutActivePlan, color: '#52525b' },
  ];

  return (
    <div className="admin-panel rounded p-5 md:p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Base de usuários
          </p>
          <h3 className="mt-2 text-lg font-medium text-zinc-100">
            Plano ativo vs sem plano
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
            Contagem de perfis cadastrados com pelo menos uma assinatura{' '}
            <span className="text-console">active</span> versus usuários sem
            assinatura ativa no momento.
          </p>
        </div>

        <DonutChart segments={segments} total={totalProfiles} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded border border-console/20 bg-console/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-console" aria-hidden="true" />
            <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
              Com plano ativo
            </p>
          </div>
          <p className="mt-2 font-mono text-2xl tabular-nums text-console">
            {withActivePlan}
          </p>
          <p className="mt-1 font-mono text-[11px] text-zinc-600">{activePct}% da base</p>
        </div>

        <div className="rounded border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" aria-hidden="true" />
            <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
              Sem plano ativo
            </p>
          </div>
          <p className="mt-2 font-mono text-2xl tabular-nums text-zinc-200">
            {withoutActivePlan}
          </p>
          <p className="mt-1 font-mono text-[11px] text-zinc-600">{inactivePct}% da base</p>
        </div>
      </div>
    </div>
  );
}
