interface Props {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

export default function DataRow({ label, value, mono }: Props) {
  return (
    <div className="grid gap-1 border-b border-white/[0.04] py-3.5 last:border-0 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-6">
      <dt className="font-display text-[0.65rem] uppercase tracking-[0.25em] text-stone-500">
        {label}
      </dt>
      <dd
        className={`text-sm leading-relaxed text-stone-200 ${mono ? 'break-all font-mono text-xs text-stone-400' : ''}`}
      >
        {value ?? '—'}
      </dd>
    </div>
  );
}
