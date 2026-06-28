import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import { getComboTermLabel } from '@/lib/checkout/combo-display';

const TERM_STYLES: Record<Exclude<BillingTerm, 'monthly'>, string> = {
  combo_3: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  combo_6: 'border-orange-400/30 bg-orange-500/10 text-orange-200',
  combo_12: 'border-gold/30 bg-gold/10 text-gold',
};

export default function ComboBadge({
  term,
  compact = false,
}: {
  term: BillingTerm;
  compact?: boolean;
}) {
  if (!isComboTerm(term)) return null;

  return (
    <span
      className={`inline-flex items-center rounded-sm border font-mono uppercase tracking-wider ${TERM_STYLES[term]} ${
        compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
      }`}
    >
      {getComboTermLabel(term)}
    </span>
  );
}
