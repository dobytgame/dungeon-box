interface Props {
  label: string;
  value: string;
  hint?: string;
  accent?: 'console' | 'warn' | 'danger' | 'neutral' | 'gold';
}

const accentBar = {
  console: 'bg-console',
  warn: 'bg-amber-400',
  danger: 'bg-red-400',
  neutral: 'bg-zinc-600',
  gold: 'bg-gold',
};

const accentValue = {
  console: 'text-console',
  warn: 'text-amber-300',
  danger: 'text-red-300',
  neutral: 'text-zinc-100',
  gold: 'text-gold',
};

export default function KpiCard({
  label,
  value,
  hint,
  accent = 'neutral',
}: Props) {
  return (
    <div className="admin-panel relative overflow-hidden rounded p-4">
      <div
        className={`absolute left-0 top-0 h-full w-0.5 ${accentBar[accent]}`}
        aria-hidden="true"
      />
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-2 font-mono text-2xl font-medium tabular-nums tracking-tight md:text-3xl ${accentValue[accent]}`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 font-mono text-[11px] leading-relaxed text-zinc-600">{hint}</p>
      ) : null}
    </div>
  );
}
