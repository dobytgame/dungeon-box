import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanSlug } from '@/lib/checkout/plans';

export type PromoCodeRow = {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed' | 'free_shipping';
  discount_value: number;
  includes_free_shipping: boolean;
  max_redemptions: number | null;
  times_redeemed: number;
  expires_at: string | null;
  active: boolean;
  plan_slugs: string[] | null;
};

export type ResolvedPromoCode = {
  promo: PromoCodeRow;
  summary: string;
  originalPriceCents: number;
  discountedPriceCents: number;
  freeShipping: boolean;
};

const MIN_CHARGE_CENTS = 100;

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function promoGrantsFreeShipping(
  promo: Pick<PromoCodeRow, 'discount_type' | 'includes_free_shipping'>
): boolean {
  return promo.discount_type === 'free_shipping' || promo.includes_free_shipping;
}

export function formatPromoSummary(promo: PromoCodeRow): string {
  if (promo.discount_type === 'free_shipping') {
    return 'Frete grátis';
  }

  let summary: string;
  if (promo.discount_type === 'percent') {
    summary = `${promo.discount_value}% de desconto`;
  } else {
    const amount = (promo.discount_value / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    summary = `${amount} de desconto`;
  }

  if (promo.includes_free_shipping) {
    return `${summary} + frete grátis`;
  }

  return summary;
}

export function applyPromoDiscount(
  priceCents: number,
  promo: Pick<PromoCodeRow, 'discount_type' | 'discount_value'>
): number {
  if (promo.discount_type === 'free_shipping') {
    return priceCents;
  }

  let discounted =
    promo.discount_type === 'percent'
      ? Math.round(priceCents * (1 - promo.discount_value / 100))
      : priceCents - promo.discount_value;

  return Math.max(discounted, MIN_CHARGE_CENTS);
}

/** Cupom já vinculado à assinatura — não revalida resgate único. */
export async function resolveStoredPromoForStorePrice(
  supabase: SupabaseClient,
  rawCode: string,
  planSlug: PlanSlug,
  originalPriceCents: number
): Promise<ResolvedPromoCode | null> {
  const code = normalizePromoCode(rawCode);
  if (!code) return null;

  const { data: promo, error } = await supabase
    .from('promo_codes')
    .select(
      'id, code, discount_type, discount_value, includes_free_shipping, max_redemptions, times_redeemed, expires_at, active, plan_slugs'
    )
    .eq('code', code)
    .maybeSingle();

  if (error || !promo || !promo.active) return null;

  if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
    return null;
  }

  if (promo.plan_slugs?.length && !promo.plan_slugs.includes(planSlug)) {
    return null;
  }

  if (promo.discount_type === 'free_shipping') {
    return null;
  }

  const normalizedPromo: PromoCodeRow = {
    ...(promo as PromoCodeRow),
    includes_free_shipping: promo.includes_free_shipping ?? false,
  };

  const discountedPriceCents = applyPromoDiscount(originalPriceCents, promo);
  if (discountedPriceCents >= originalPriceCents) {
    return null;
  }

  return {
    promo: normalizedPromo,
    summary: formatPromoSummary(normalizedPromo),
    originalPriceCents,
    discountedPriceCents,
    freeShipping: promoGrantsFreeShipping(normalizedPromo),
  };
}

async function userAlreadyRedeemed(
  supabase: SupabaseClient,
  promoCodeId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('promo_code_redemptions')
    .select('id')
    .eq('promo_code_id', promoCodeId)
    .eq('user_id', userId)
    .maybeSingle();

  return Boolean(data);
}

export async function resolvePromoCode(
  supabase: SupabaseClient,
  rawCode: string,
  planSlug: PlanSlug,
  userId: string,
  originalPriceCents: number
): Promise<ResolvedPromoCode> {
  const code = normalizePromoCode(rawCode);
  if (!code) {
    throw new Error('Informe o código do cupom.');
  }

  const { data: promo, error } = await supabase
    .from('promo_codes')
    .select(
      'id, code, discount_type, discount_value, includes_free_shipping, max_redemptions, times_redeemed, expires_at, active, plan_slugs'
    )
    .eq('code', code)
    .maybeSingle();

  if (error || !promo) {
    throw new Error('Cupom inválido, expirado ou já utilizado.');
  }

  if (!promo.active) {
    throw new Error('Cupom inválido, expirado ou já utilizado.');
  }

  if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
    throw new Error('Este cupom expirou.');
  }

  if (
    promo.max_redemptions != null &&
    promo.times_redeemed >= promo.max_redemptions
  ) {
    throw new Error('Este cupom atingiu o limite de uso.');
  }

  if (
    promo.plan_slugs?.length &&
    !promo.plan_slugs.includes(planSlug)
  ) {
    throw new Error('Este cupom não é válido para o plano selecionado.');
  }

  if (await userAlreadyRedeemed(supabase, promo.id, userId)) {
    throw new Error('Você já utilizou este cupom.');
  }

  const normalizedPromo: PromoCodeRow = {
    ...(promo as PromoCodeRow),
    includes_free_shipping: promo.includes_free_shipping ?? false,
  };

  const discountedPriceCents = applyPromoDiscount(originalPriceCents, promo);

  return {
    promo: normalizedPromo,
    summary: formatPromoSummary(normalizedPromo),
    originalPriceCents,
    discountedPriceCents,
    freeShipping: promoGrantsFreeShipping(normalizedPromo),
  };
}

export async function recordPromoRedemption(
  supabase: SupabaseClient,
  promoCodeId: string,
  userId: string,
  subscriptionId: string,
  code: string
): Promise<void> {
  const { error: redemptionError } = await supabase
    .from('promo_code_redemptions')
    .insert({
      promo_code_id: promoCodeId,
      user_id: userId,
      subscription_id: subscriptionId,
    });

  if (redemptionError) {
    console.error('[promo] redemption insert:', redemptionError);
    return;
  }

  const { data: promo } = await supabase
    .from('promo_codes')
    .select('times_redeemed')
    .eq('id', promoCodeId)
    .single();

  if (!promo) return;

  await supabase
    .from('promo_codes')
    .update({
      times_redeemed: (promo.times_redeemed ?? 0) + 1,
    })
    .eq('id', promoCodeId);

  await supabase
    .from('subscriptions')
    .update({ promo_code: code })
    .eq('id', subscriptionId);
}
