import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';

export type ResolvedPromotionCode = {
  id: string;
  code: string;
  summary: string;
};

export function stripeCouponsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_STRIPE_COUPONS_ENABLED === 'true';
}

function formatCouponSummary(coupon: Stripe.Coupon): string {
  if (coupon.percent_off) {
    const duration =
      coupon.duration === 'once'
        ? ' na primeira cobrança'
        : coupon.duration === 'repeating'
          ? ` por ${coupon.duration_in_months ?? ''} meses`.trim()
          : ' em todas as cobranças';
    return `${coupon.percent_off}% de desconto${duration}`;
  }

  if (coupon.amount_off && coupon.currency) {
    const amount = (coupon.amount_off / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: coupon.currency.toUpperCase(),
    });
    return `${amount} de desconto`;
  }

  return 'Cupom aplicado';
}

function couponFromPromotion(
  promotion: Stripe.PromotionCode
): Stripe.Coupon | null {
  const coupon = promotion.promotion?.coupon;
  if (!coupon || typeof coupon === 'string') return null;
  return coupon;
}

async function findPromotionCode(
  stripe: Stripe,
  rawCode: string
): Promise<Stripe.PromotionCode | null> {
  const trimmed = rawCode.trim();
  if (!trimmed) return null;

  const candidates = Array.from(new Set([trimmed, trimmed.toUpperCase()]));

  for (const code of candidates) {
    const { data } = await stripe.promotionCodes.list({
      code,
      active: true,
      limit: 1,
      expand: ['data.promotion.coupon'],
    });
    if (data[0]) return data[0];
  }

  return null;
}

export async function resolvePromotionCode(
  rawCode: string
): Promise<ResolvedPromotionCode> {
  if (!stripeCouponsEnabled()) {
    throw new Error('Cupons de desconto não estão habilitados.');
  }

  const stripe = getStripe();
  const promotion = await findPromotionCode(stripe, rawCode);

  if (!promotion) {
    throw new Error('Cupom inválido, expirado ou já utilizado.');
  }

  if (promotion.max_redemptions && promotion.times_redeemed >= promotion.max_redemptions) {
    throw new Error('Este cupom atingiu o limite de uso.');
  }

  if (promotion.expires_at && promotion.expires_at * 1000 < Date.now()) {
    throw new Error('Este cupom expirou.');
  }

  const coupon = couponFromPromotion(promotion);
  if (!coupon) {
    throw new Error('Cupom inválido.');
  }

  if (coupon.valid === false) {
    throw new Error('Cupom inválido ou expirado.');
  }

  return {
    id: promotion.id,
    code: promotion.code,
    summary: formatCouponSummary(coupon),
  };
}
