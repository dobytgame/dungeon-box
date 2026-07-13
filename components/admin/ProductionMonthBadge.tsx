interface Props {
  cycleNumber: number;
  compact?: boolean;
}

export default function ProductionMonthBadge({ cycleNumber, compact = false }: Props) {
  if (!cycleNumber || cycleNumber < 1) return null;

  return (
    <span
      className={`inline-flex items-center rounded border border-cyan-500/35 bg-cyan-500/10 font-mono uppercase tracking-wider text-cyan-200 ${
        compact
          ? 'px-1.5 py-0.5 text-[9px] tracking-[0.1em]'
          : 'px-2 py-0.5 text-[10px] tracking-[0.12em]'
      }`}
    >
      Mês {cycleNumber}
    </span>
  );
}
