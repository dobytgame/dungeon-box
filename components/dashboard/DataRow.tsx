interface Props {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  /** Evita quebra estranha em datas e valores curtos. */
  nowrap?: boolean;
}

export default function DataRow({ label, value, mono, nowrap }: Props) {
  return (
    <div className="grid gap-1 border-b border-white/[0.06] py-3 sm:items-baseline sm:py-3.5 last:border-0 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-4">
      <dt className="home-v2-display text-[10px] tracking-[0.16em] text-mesa-jade sm:text-[11px] sm:tracking-[0.18em]">
        {label}
      </dt>
      <dd
        className={`min-w-0 text-sm leading-snug text-mesa-parchment ${
          mono ? 'break-all font-mono text-xs text-mesa-ash' : ''
        } ${nowrap ? 'sm:whitespace-nowrap' : ''}`}
      >
        {value ?? '—'}
      </dd>
    </div>
  );
}
