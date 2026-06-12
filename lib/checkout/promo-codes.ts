import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanSlug } from '@/lib/checkout/plans';

export type PromoCodeRow = {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
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
};

const MIN_CHARGE_CENTS = 100;

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function formatPromoSummary(promo: PromoCodeRow): string {
  if (promo.discount_type === 'percent') {
    return `${promo.discount_value}% de desconto`;
  }

  const amount = (promo.discount_value / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  return `${amount} de desconto`;
}

export function applyPromoDiscount(
  priceCents: number,
  promo: Pick<PromoCodeRow, 'discount_type' | 'discount_value'>
): number {
  let discounted =
    promo.discount_type === 'percent'
      ? Math.round(priceCents * (1 - promo.discount_value / 100))
      : priceCents - promo.discount_value;

  return Math.max(discounted, MIN_CHARGE_CENTS);
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
      'id, code, discount_type, discount_value, max_redemptions, times_redeemed, expires_at, active, plan_slugs'
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

  const discountedPriceCents = applyPromoDiscount(originalPriceCents, promo);

  return {
    promo: promo as PromoCodeRow,
    summary: formatPromoSummary(promo as PromoCodeRow),
    originalPriceCents,
    discountedPriceCents,
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
