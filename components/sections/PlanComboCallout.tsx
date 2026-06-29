import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { COMBO_OPTIONS, comboInstallmentPromoLine } from '@/lib/checkout/combo-billing';
import { checkoutHref, type PlanSlug } from '@/lib/checkout/plans';
import { getComboTermBadge } from '@/lib/checkout/combo-display';

export default function PlanComboCallout({ planId }: { planId: PlanSlug }) {
  return (
    <div className="mt-4 rounded-sm border border-gold/20 bg-gold/[0.04] px-4 py-3">
      <p className="flex items-center gap-2 font-display text-[10px] uppercase tracking-[0.2em] text-gold">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Pacotes combo
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-stone-400">
        {comboInstallmentPromoLine(planId)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {COMBO_OPTIONS.map((option) => (
          <Link
            key={option.term}
            href={checkoutHref(planId, option.term)}
            className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 bg-stone-950/40 px-2.5 py-1.5 text-xs text-stone-300 transition-colors hover:border-gold/30 hover:text-white"
          >
            {option.label}
            <span className="font-display text-[10px] uppercase tracking-wider text-gold">
              {getComboTermBadge(option.term)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
