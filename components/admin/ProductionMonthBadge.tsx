'use client';

import {
  formatProductionMonthBadgeLabel,
} from '@/lib/admin/production-month-display';

interface Props {
  productionMonthKey: string | null;
  paidAt: string | null;
  cycleNumber: number;
  compact?: boolean;
}

export default function ProductionMonthBadge({
  productionMonthKey,
  paidAt,
  cycleNumber,
  compact = false,
}: Props) {
  const label = formatProductionMonthBadgeLabel({
    productionMonthKey,
    paidAt,
    cycleNumber,
    compact,
  });

  if (!label) return null;

  return (
    <span
      className={`inline-flex items-center rounded border border-cyan-500/35 bg-cyan-500/10 font-mono uppercase tracking-wider text-cyan-200 ${
        compact
          ? 'px-1.5 py-0.5 text-[9px] tracking-[0.1em]'
          : 'px-2 py-0.5 text-[10px] tracking-[0.12em]'
      }`}
      title={
        productionMonthKey
          ? `Mês de produção no kanban (ciclo #${cycleNumber})`
          : undefined
      }
    >
      {label}
    </span>
  );
}
