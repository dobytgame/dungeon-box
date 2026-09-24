interface Props {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

export default function DataRow({ label, value, mono }: Props) {
  return (
    <div className="grid gap-1 border-b border-white/[0.06] py-3.5 last:border-0 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-6">
      <dt className="home-v2-display text-[11px] tracking-[0.18em] text-mesa-jade">{label}</dt>
      <dd
        className={`text-sm leading-relaxed text-mesa-parchment ${mono ? 'break-all font-mono text-xs text-mesa-ash' : ''}`}
      >
        {value ?? '—'}
      </dd>
    </div>
  );
}
