import {
  applyComboDiscountCents,
  COMBO_OPTIONS,
} from '@/lib/checkout/combo-billing';

export const BLACK_FRIDAY_CAMPAIGN_CODE = 'black-friday-2026';
export const BLACK_FRIDAY_PLAN_SLUG = 'lendario';

export const BLACK_FRIDAY_START = Date.parse('2026-11-01T00:00:00-03:00');
export const BLACK_FRIDAY_END = Date.parse('2026-12-01T00:00:00-03:00');

/** Mensal: % sobre o plano (frete fora) nos primeiros ciclos. */
export const BF_MONTHLY_DISCOUNT_PERCENT = 8;
export const BF_MONTHLY_DISCOUNT_CYCLES = 3;

/** Combo: % sobre (plano + frete) × meses. Renovação volta ao preço normal do combo. */
export const BF_COMBO_TERM = 'combo_3' as const;
export const BF_COMBO_DISCOUNT_PERCENT = 15;
export const BF_COMBO_MONTHS = 3;

/** Juros repassados ao cliente a partir de 2x (tabela Price). */
export const BF_INSTALLMENT_MONTHLY_RATE = 0.0299;
export const BF_MAX_INSTALLMENTS = 12;

export type BlackFridayOption = 'mensal' | 'combo';
export type BlackFridayWindow = 'upcoming' | 'open' | 'closed';

export function isBlackFridayOption(value: unknown): value is BlackFridayOption {
  return value === 'mensal' || value === 'combo';
}

/** `BLACK_FRIDAY_CHECKOUT_PREVIEW=true` abre o checkout fora das datas, só fora de produção. */
export function getBlackFridayWindow(now: number = Date.now()): BlackFridayWindow {
  if (
    process.env.BLACK_FRIDAY_CHECKOUT_PREVIEW === 'true' &&
    process.env.VERCEL_ENV !== 'production' &&
    process.env.NODE_ENV !== 'production'
  ) {
    return 'open';
  }
  if (now >= BLACK_FRIDAY_END) return 'closed';
  if (now < BLACK_FRIDAY_START) return 'upcoming';
  return 'open';
}

export function bfMonthlyDiscountCents(planCents: number): number {
  return Math.round((planCents * BF_MONTHLY_DISCOUNT_PERCENT) / 100);
}

export function bfMonthlyPromoPlanCents(planCents: number): number {
  return planCents - bfMonthlyDiscountCents(planCents);
}

export function bfComboListCents(planCents: number, shippingCents: number): number {
  return (planCents + shippingCents) * BF_COMBO_MONTHS;
}

export function bfComboTotalCents(planCents: number, shippingCents: number): number {
  const list = bfComboListCents(planCents, shippingCents);
  return Math.round((list * (100 - BF_COMBO_DISCOUNT_PERCENT)) / 100);
}

/** Preço normal do combo 3 meses, usado na renovação automática. */
export function bfComboRenewalCents(planCents: number, shippingCents: number): number {
  const option = COMBO_OPTIONS.find((o) => o.term === BF_COMBO_TERM)!;
  return applyComboDiscountCents(
    (planCents + shippingCents) * option.monthsPaid,
    BF_COMBO_TERM
  );
}

export type InstallmentPlan = {
  count: number;
  installmentCents: number;
  totalCents: number;
  interestCents: number;
};

/** Tabela Price: parcela fixa arredondada para cima; total = parcela × n. */
export function bfInstallmentPlan(
  principalCents: number,
  count: number,
  monthlyRate: number = BF_INSTALLMENT_MONTHLY_RATE
): InstallmentPlan {
  const n = Math.min(Math.max(1, Math.trunc(count)), BF_MAX_INSTALLMENTS);
  if (n === 1 || monthlyRate <= 0) {
    const installmentCents = n === 1 ? principalCents : Math.ceil(principalCents / n);
    const totalCents = n === 1 ? principalCents : installmentCents * n;
    return { count: n, installmentCents, totalCents, interestCents: totalCents - principalCents };
  }
  const factor = monthlyRate / (1 - Math.pow(1 + monthlyRate, -n));
  const installmentCents = Math.ceil(principalCents * factor);
  const totalCents = installmentCents * n;
  return { count: n, installmentCents, totalCents, interestCents: totalCents - principalCents };
}

export function bfInstallmentPlans(principalCents: number): InstallmentPlan[] {
  return Array.from({ length: BF_MAX_INSTALLMENTS }, (_, i) =>
    bfInstallmentPlan(principalCents, i + 1)
  );
}

export type BlackFridayQuote =
  | {
      option: 'mensal';
      planCents: number;
      shippingCents: number;
      discountCents: number;
      firstChargeCents: number;
      regularChargeCents: number;
      discountCycles: number;
    }
  | {
      option: 'combo';
      planCents: number;
      shippingCents: number;
      listCents: number;
      comboCents: number;
      discountCents: number;
      installments: InstallmentPlan;
      chargeCents: number;
      renewalCents: number;
    };

export function quoteBlackFriday(input: {
  option: BlackFridayOption;
  planCents: number;
  shippingCents: number;
  installmentCount?: number;
}): BlackFridayQuote {
  const { planCents, shippingCents } = input;

  if (input.option === 'mensal') {
    const discountCents = bfMonthlyDiscountCents(planCents);
    return {
      option: 'mensal',
      planCents,
      shippingCents,
      discountCents,
      firstChargeCents: planCents - discountCents + shippingCents,
      regularChargeCents: planCents + shippingCents,
      discountCycles: BF_MONTHLY_DISCOUNT_CYCLES,
    };
  }

  const listCents = bfComboListCents(planCents, shippingCents);
  const comboCents = bfComboTotalCents(planCents, shippingCents);
  const installments = bfInstallmentPlan(comboCents, input.installmentCount ?? 1);
  return {
    option: 'combo',
    planCents,
    shippingCents,
    listCents,
    comboCents,
    discountCents: listCents - comboCents,
    installments,
    chargeCents: installments.totalCents,
    renewalCents: bfComboRenewalCents(planCents, shippingCents),
  };
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatRatePercent(rate: number = BF_INSTALLMENT_MONTHLY_RATE): string {
  return `${(rate * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

/** Onde o cliente clicou antes do checkout (LP Black Friday). */
export const BLACK_FRIDAY_CTA_PLACEMENTS = [
  'hero',
  'oferta',
  'sticky',
  'footer',
  'promo_bar',
  'direct',
  'unknown',
] as const;

export type BlackFridayCtaPlacement = (typeof BLACK_FRIDAY_CTA_PLACEMENTS)[number];

const CTA_PLACEMENT_SET = new Set<string>(BLACK_FRIDAY_CTA_PLACEMENTS);

export function parseBlackFridayCtaPlacement(value: unknown): BlackFridayCtaPlacement {
  if (typeof value === 'string' && CTA_PLACEMENT_SET.has(value)) {
    return value as BlackFridayCtaPlacement;
  }
  return 'unknown';
}

export function blackFridayCtaPlacementLabel(placement: string): string {
  const labels: Record<string, string> = {
    hero: 'Hero (topo)',
    oferta: 'Cupom no meio da página',
    sticky: 'Barra fixa (mobile)',
    footer: 'Rodapé',
    promo_bar: 'Faixa promocional',
    direct: 'Link direto',
    unknown: 'Sem origem',
  };
  return labels[placement] ?? placement;
}

export function blackFridayCheckoutHref(
  option: BlackFridayOption,
  placement: BlackFridayCtaPlacement
): string {
  const params = new URLSearchParams({ plano: option, origem: placement });
  return `/black-friday/checkout?${params.toString()}`;
}
