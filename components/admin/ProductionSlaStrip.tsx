import {
  productionSlaLabel,
  productionSlaTitle,
  resolveProductionSla,
} from '@/lib/production/sla';

const TONE_CLASS: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-emerald-500/20 text-emerald-200',
  yellow: 'bg-amber-400/25 text-amber-100',
  red: 'bg-red-500/30 text-red-100',
};

export default function ProductionSlaStrip({
  paidAt,
  status,
  shippedAt,
}: {
  paidAt?: string | null;
  status?: string | null;
  shippedAt?: string | null;
}) {
  const sla = resolveProductionSla({ paidAt, status, shippedAt });
  if (!sla) return null;

  return (
    <p
      title={productionSlaTitle(sla)}
      className={`-mx-3 -mb-3 mt-3 px-3 py-1.5 text-center font-mono text-[10px] font-medium uppercase tracking-[0.12em] ${TONE_CLASS[sla.tone]}`}
    >
      {productionSlaLabel(sla)}
    </p>
  );
}
