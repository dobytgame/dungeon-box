'use client';

import Link from 'next/link';
import { CreditCard, Sparkles } from 'lucide-react';
import { plans } from '@/lib/data';
import { checkoutHref } from '@/lib/checkout/plans';
import { COMBO_OPTIONS } from '@/lib/checkout/combo-billing';
import {
  estimateComboPlanTotalCents,
  getComboTermBadge,
} from '@/lib/checkout/combo-display';
import type { PlanSlug } from '@/lib/checkout/plans';

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function ComboPlansPromo() {
  const featured = plans.find((p) => p.featured) ?? plans[1]!;
  const monthlyCents = featured.price * 100;

  return (
    <section
      className="border-y border-white/[0.06] bg-gradient-to-b from-gold/[0.04] to-transparent py-16 md:py-20"
      aria-labelledby="combo-plans-title"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-display text-xs uppercase tracking-[0.35em] text-gold">
            Pacotes combo
          </p>
          <h2
            id="combo-plans-title"
            className="mt-3 font-display text-3xl uppercase leading-[0.95] tracking-wide text-white md:text-4xl"
          >
            Antecipe e{' '}
            <span className="text-gradient-ember">economize</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-stone-400">
            Pague vários meses de uma vez com desconto. Parcelamento em até 12x
            no cartão — até 4x sem juros (Lendário 6/12 meses: até 6x sem
            juros).
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {COMBO_OPTIONS.map((option) => {
            const total = estimateComboPlanTotalCents(monthlyCents, option.term);
            const href = checkoutHref(featured.id as PlanSlug, option.term);

            return (
              <Link
                key={option.term}
                href={href}
                className="group relative cursor-pointer overflow-hidden rounded-sm border border-white/[0.08] bg-stone-950/50 p-5 transition-colors hover:border-gold/30 hover:bg-stone-950/80"
              >
                <span className="absolute right-4 top-4 rounded-sm bg-gold/15 px-2 py-0.5 font-display text-[10px] uppercase tracking-widest text-gold">
                  {getComboTermBadge(option.term)}
                </span>
                <div className="flex items-center gap-2 text-gold">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <p className="font-display text-sm uppercase tracking-widest">
                    {option.label}
                  </p>
                </div>
                <p className="mt-3 text-sm text-stone-400">{option.description}</p>
                <p className="mt-5 font-display text-2xl text-white">
                  {formatBRL(total)}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Plano {featured.name} · frete à parte
                </p>
                <p className="mt-4 font-display text-[10px] uppercase tracking-[0.2em] text-ember opacity-0 transition-opacity group-hover:opacity-100">
                  Assinar combo →
                </p>
              </Link>
            );
          })}
        </div>

        <p className="mt-6 flex flex-wrap items-center gap-2 text-xs text-stone-500">
          <CreditCard className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Disponível para um plano por vez · Após o combo, renovação no valor
          mensal normal
        </p>
      </div>
    </section>
  );
}
