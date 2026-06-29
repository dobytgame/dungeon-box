'use client';

import { Check, MapPin, Package, Paintbrush, Tag, Truck } from 'lucide-react';
import { plans } from '@/lib/data';
import {
  calculateComboSavingsCents,
  calculateComboTotalCents,
  COMBO_BILLING_ENABLED,
  comboInstallmentLabel,
  comboInterestFreeMaxForCheckout,
  isComboTerm,
} from '@/lib/checkout/combo-billing';
import { resolveBumpBilling, sumRecurringCheckoutCents } from '@/lib/checkout/bump-billing';
import type { CheckoutData } from '@/lib/checkout/types';
import {
  getEffectivePlanCents,
  getPlanPriceCents,
  sumMonthlyCents,
  sumShippingCents,
} from '@/lib/checkout/totals';
import { getPlanTheme } from '@/lib/plan-theme';
import { formatZip } from '@/lib/dashboard/format';
import type { Address } from '@/lib/dashboard/types';
import type { PlanSlug } from '@/lib/checkout/plans';

interface Props {
  data: CheckoutData;
  step: number;
  addresses: Address[];
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function CheckoutSummary({ data, step, addresses }: Props) {
  const { bump, monthlyExtraCents, oneTimeExtraCents } = resolveBumpBilling(data);
  const address = addresses.find((a) => a.id === data.addressId);
  const monthlyTotalCents = sumMonthlyCents(data);
  const recurringTotalCents = sumRecurringCheckoutCents(data);
  const comboTerm =
    COMBO_BILLING_ENABLED && isComboTerm(data.billingTerm)
      ? data.billingTerm
      : null;
  const isCombo = comboTerm !== null;
  const comboTotalCents = comboTerm
    ? calculateComboTotalCents(data, comboTerm)
    : 0;
  const comboSavingsCents = comboTerm
    ? calculateComboSavingsCents(data, comboTerm)
    : 0;
  const comboInterestFreeMax = comboTerm
    ? comboInterestFreeMaxForCheckout(data)
    : 4;
  const originalMonthlyTotalCents = data.planSlugs.reduce(
    (sum, slug) => sum + getPlanPriceCents(slug),
    0
  );
  const hasDiscount = monthlyTotalCents < originalMonthlyTotalCents;
  const shippingTotalCents = sumShippingCents(data);
  const firstChargeCents = recurringTotalCents + oneTimeExtraCents;
  const hasFirstChargeExtras = oneTimeExtraCents > 0;
  const showRecurringBump = Boolean(bump) && data.paintKitBumpRecurring;
  const originalRecurringTotalCents =
    originalMonthlyTotalCents +
    (showRecurringBump ? monthlyExtraCents : 0) +
    shippingTotalCents;

  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <div className="overflow-hidden rounded-sm border border-white/[0.08] bg-stone-950/60 backdrop-blur-sm">
        <div className="h-1 w-full bg-ember" aria-hidden="true" />

        <div className="p-5 md:p-6">
          <p className="font-display text-[10px] uppercase tracking-[0.3em] text-stone-500">
            Resumo do pedido
          </p>

          <div className="mt-4 space-y-3 border-b border-white/[0.06] pb-4">
            {data.planSlugs.map((slug) => {
              const plan = plans.find((p) => p.id === slug)!;
              const theme = getPlanTheme(plan.accent);
              const planCents = getPlanPriceCents(slug);
              const effectiveCents = getEffectivePlanCents(data, slug);
              const planDiscount = effectiveCents < planCents;

              return (
                <div
                  key={slug}
                  className="flex items-start justify-between gap-3"
                >
                  <div>
                    <p
                      className={`font-display text-sm uppercase tracking-wide ${theme.nameClass}`}
                    >
                      {plan.name}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {isCombo ? 'Incluso no combo' : 'Assinatura mensal'}
                    </p>
                  </div>
                  <p className="shrink-0 text-right">
                    {planDiscount ? (
                      <>
                        <span className="block font-display text-xs tabular-nums text-stone-500 line-through">
                          R$ {plan.price}
                        </span>
                        <span className="font-display text-lg tabular-nums text-emerald-300">
                          {formatBRL(effectiveCents)}
                        </span>
                      </>
                    ) : (
                      <span className="font-display text-lg tabular-nums text-white">
                        R$ {plan.price}
                      </span>
                    )}
                    <span className="block text-[10px] uppercase tracking-widest text-stone-600">
                      por mês
                    </span>
                  </p>
                </div>
              );
            })}
          </div>

          {data.planSlugs.length > 1 ? (
            <div className="flex items-baseline justify-between gap-2 border-b border-white/[0.06] py-3">
              <p className="text-xs text-stone-500">Total mensal</p>
              <p className="font-display text-base tabular-nums text-white">
                {hasDiscount ? (
                  <>
                    <span className="mr-2 text-sm text-stone-500 line-through">
                      {formatBRL(originalMonthlyTotalCents)}
                    </span>
                    <span className="text-emerald-300">
                      {formatBRL(monthlyTotalCents)}
                    </span>
                  </>
                ) : (
                  formatBRL(monthlyTotalCents)
                )}
              </p>
            </div>
          ) : null}

          {hasDiscount && data.couponCode ? (
            <div className="border-b border-white/[0.06] py-3">
              <p className="flex items-center gap-2 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100/90">
                <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  <span className="font-medium">{data.couponCode}</span>
                  {data.couponSummary ? ` — ${data.couponSummary}` : null}
                </span>
              </p>
            </div>
          ) : null}

          {step >= 1 && data.planSlugs.length === 1 ? (
            (() => {
              const slug = data.planSlugs[0] as PlanSlug;
              const plan = plans.find((p) => p.id === slug)!;
              const theme = getPlanTheme(plan.accent);
              const deliveryItems =
                'deliveryItems' in plan && Array.isArray(plan.deliveryItems)
                  ? plan.deliveryItems
                  : [];

              if (deliveryItems.length === 0) return null;

              return (
                <div className="border-b border-white/[0.06] py-4">
                  <div className="flex items-center gap-2 text-stone-500">
                    <Package className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <p className="font-display text-[10px] uppercase tracking-[0.25em]">
                      Na sua caixa
                    </p>
                  </div>
                  <ul className="mt-3 max-h-36 space-y-2 overflow-y-auto pr-1 text-xs leading-relaxed text-stone-400 [scrollbar-width:thin]">
                    {deliveryItems.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check
                          className={`mt-0.5 h-3 w-3 shrink-0 ${theme.checkClass}`}
                          aria-hidden="true"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()
          ) : null}

          {bump ? (
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] py-4">
              <div className="flex gap-2">
                <Paintbrush
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs font-medium text-stone-200">{bump.name}</p>
                  <p className="mt-0.5 text-[10px] text-stone-500">
                    {data.paintKitBumpRecurring
                      ? 'Todo mês na caixa · assinatura'
                      : 'Pagamento único · 1ª caixa'}
                  </p>
                </div>
              </div>
              <p className="shrink-0 text-right font-display text-sm text-gold">
                {bump.priceLabel}
                {data.paintKitBumpRecurring ? (
                  <span className="block text-[10px] uppercase tracking-widest text-stone-600">
                    /mês
                  </span>
                ) : null}
              </p>
            </div>
          ) : null}

          {showRecurringBump ? (
            <div className="flex items-baseline justify-between gap-2 border-b border-white/[0.06] py-3">
              <p className="text-xs text-stone-500">Total mensal c/ kit</p>
              <p className="font-display text-base tabular-nums text-white">
                {formatBRL(recurringTotalCents)}
                <span className="text-sm text-stone-500">/mês</span>
              </p>
            </div>
          ) : null}

          {step >= 2 &&
          data.planSlugs.some((slug) => data.shippingByPlan?.[slug]?.label) ? (
            <div className="space-y-3 border-b border-white/[0.06] py-4">
              <div className="flex items-center gap-2 text-stone-500">
                <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <p className="font-display text-[10px] uppercase tracking-[0.25em]">
                  Frete mensal
                </p>
              </div>
              {data.planSlugs.map((slug) => {
                const quote = data.shippingByPlan?.[slug];
                if (!quote?.label) return null;
                const plan = plans.find((p) => p.id === slug)!;
                return (
                  <div
                    key={slug}
                    className="flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-medium text-stone-200">{plan.name}</p>
                      <p className="mt-0.5 text-stone-500">{quote.label}</p>
                    </div>
                    <p className="shrink-0 font-display text-sm text-frost">
                      {quote.free ? 'Grátis' : formatBRL(quote.cents)}
                      {!quote.free ? (
                        <span className="block text-[10px] uppercase tracking-widest text-stone-600">
                          /mês
                        </span>
                      ) : null}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : null}

          {step >= 2 && address ? (
            <div className="border-b border-white/[0.06] py-4">
              <div className="flex items-center gap-2 text-stone-500">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <p className="font-display text-[10px] uppercase tracking-[0.25em]">
                  Entrega
                </p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-stone-400">
                {address.recipient}
                <br />
                {address.street}, {address.number}
                <br />
                {address.neighborhood} — {address.city}/{address.state}
                <br />
                CEP {formatZip(address.zip_code)}
              </p>
            </div>
          ) : null}

          {isCombo ? (
            <div className="border-b border-white/[0.06] py-4">
              <p className="font-display text-[10px] uppercase tracking-[0.25em] text-gold">
                Pacote combo
              </p>
              <div className="mt-3 flex items-baseline justify-between gap-2">
                <p className="text-xs text-stone-500">Total do combo</p>
                <p className="font-display text-lg tabular-nums text-gold">
                  {formatBRL(comboTotalCents)}
                </p>
              </div>
              {comboSavingsCents > 0 ? (
                <p className="mt-1 text-right text-xs text-emerald-400/90">
                  Economia de {formatBRL(comboSavingsCents)}
                </p>
              ) : null}
              {data.installmentCount > 1 ? (
                <p className="mt-2 text-right text-[11px] text-stone-500">
                  {comboInstallmentLabel(data.installmentCount, comboInterestFreeMax)}
                </p>
              ) : null}
              <p className="mt-2 text-[11px] text-stone-600">
                Depois, {formatBRL(recurringTotalCents)}/mês
              </p>
            </div>
          ) : null}

          <div className="pt-4">
            {isCombo ? (
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs text-stone-500">Cobrança agora</p>
                <p className="font-display text-lg tabular-nums text-white">
                  {formatBRL(comboTotalCents)}
                  {data.installmentCount > 1 ? (
                    <span className="ml-2 text-sm text-stone-500">
                      ({comboInstallmentLabel(data.installmentCount, comboInterestFreeMax)})
                    </span>
                  ) : null}
                </p>
              </div>
            ) : hasFirstChargeExtras ? (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs text-stone-500">1ª cobrança</p>
                  <p className="font-display text-lg tabular-nums text-white">
                    {formatBRL(firstChargeCents)}
                  </p>
                </div>
                <p className="mt-1 text-right text-[10px] text-stone-600">
                  Depois,{' '}
                  {hasDiscount || showRecurringBump || shippingTotalCents > 0 ? (
                    <>
                      <span className="text-stone-500 line-through">
                        {formatBRL(originalRecurringTotalCents)}/mês
                      </span>{' '}
                      <span className="text-emerald-400/90">
                        {formatBRL(recurringTotalCents)}/mês
                      </span>
                    </>
                  ) : (
                    <>{formatBRL(recurringTotalCents)}/mês</>
                  )}
                </p>
              </>
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs text-stone-500">Total recorrente</p>
                <p className="font-display text-lg tabular-nums text-white">
                  {hasDiscount || showRecurringBump || shippingTotalCents > 0 ? (
                    <>
                      <span className="mr-2 text-sm text-stone-500 line-through">
                        {formatBRL(originalRecurringTotalCents)}
                      </span>
                      <span className="text-emerald-300">
                        {formatBRL(recurringTotalCents)}
                      </span>
                    </>
                  ) : (
                    formatBRL(recurringTotalCents)
                  )}
                  <span className="text-sm text-stone-500">/mês</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 hidden text-center text-[11px] leading-relaxed text-stone-600 lg:block">
        Cancele quando quiser · Peças em cinza pedra
      </p>
    </aside>
  );
}
