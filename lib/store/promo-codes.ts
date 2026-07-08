import type { SupabaseClient } from '@supabase/supabase-js';
import {
  applyPromoDiscount,
  formatPromoSummary,
  normalizePromoCode,
  promoGrantsFreeShipping,
  type PromoCodeRow,
} from '@/lib/checkout/promo-codes';

export type ResolvedStorePromo = {
  promo: PromoCodeRow;
  summary: string;
  originalSubtotalCents: number;
  discountedSubtotalCents: number;
  subtotalDiscountCents: number;
  freeShipping: boolean;
};

type PromoAppliesTo = 'subscription' | 'store' | 'both';

function promoAppliesToStore(
  promo: Pick<PromoCodeRow, 'applies_to'>
): boolean {
  const scope = (promo.applies_to ?? 'subscription') as PromoAppliesTo;
  return scope === 'store' || scope === 'both';
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

export async function resolveStorePromoCode(
  supabase: SupabaseClient,
  rawCode: string,
  userId: string,
  subtotalCents: number,
  options?: {
    /** Envio avulso (frete cobrado separadamente). */
    standaloneShipping?: boolean;
    shippingCents?: number;
  }
): Promise<ResolvedStorePromo> {
  const code = normalizePromoCode(rawCode);
  if (!code) {
    throw new Error('Informe o código do cupom.');
  }

  if (subtotalCents <= 0) {
    throw new Error('Carrinho inválido para aplicar cupom.');
  }

  const { data: promo, error } = await supabase
    .from('promo_codes')
    .select(
      'id, code, discount_type, discount_value, includes_free_shipping, max_redemptions, times_redeemed, expires_at, active, plan_slugs, applies_to'
    )
    .eq('code', code)
    .maybeSingle();

  if (error || !promo) {
    throw new Error('Cupom inválido, expirado ou já utilizado.');
  }

  if (!promo.active) {
    throw new Error('Cupom inválido, expirado ou já utilizado.');
  }

  if (!promoAppliesToStore(promo)) {
    throw new Error('Este cupom não é válido na loja.');
  }

  if (promo.plan_slugs?.length) {
    throw new Error('Este cupom não é válido na loja.');
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

  if (await userAlreadyRedeemed(supabase, promo.id, userId)) {
    throw new Error('Você já utilizou este cupom.');
  }

  const normalizedPromo: PromoCodeRow = {
    ...(promo as PromoCodeRow),
    includes_free_shipping: promo.includes_free_shipping ?? false,
    applies_to: (promo.applies_to ?? 'subscription') as PromoCodeRow['applies_to'],
  };

  const grantsFreeShipping = promoGrantsFreeShipping(normalizedPromo);
  const shippingCents = options?.shippingCents ?? 0;
  const standaloneShipping = options?.standaloneShipping ?? false;

  if (normalizedPromo.discount_type === 'free_shipping') {
    if (!standaloneShipping || shippingCents <= 0) {
      throw new Error(
        'Este cupom vale apenas para pedidos com envio avulso (frete calculado no checkout).'
      );
    }

    return {
      promo: normalizedPromo,
      summary: formatPromoSummary(normalizedPromo),
      originalSubtotalCents: subtotalCents,
      discountedSubtotalCents: subtotalCents,
      subtotalDiscountCents: 0,
      freeShipping: true,
    };
  }

  const discountedSubtotalCents = applyPromoDiscount(
    subtotalCents,
    normalizedPromo
  );
  const subtotalDiscountCents = Math.max(
    0,
    subtotalCents - discountedSubtotalCents
  );
  const freeShipping =
    grantsFreeShipping && standaloneShipping && shippingCents > 0;

  if (subtotalDiscountCents <= 0 && !freeShipping) {
    throw new Error('Este cupom não se aplica ao seu pedido.');
  }

  return {
    promo: normalizedPromo,
    summary: formatPromoSummary(normalizedPromo),
    originalSubtotalCents: subtotalCents,
    discountedSubtotalCents,
    subtotalDiscountCents,
    freeShipping,
  };
}

export async function recordStorePromoRedemption(
  supabase: SupabaseClient,
  promoCodeId: string,
  userId: string
): Promise<void> {
  const { error: redemptionError } = await supabase
    .from('promo_code_redemptions')
    .insert({
      promo_code_id: promoCodeId,
      user_id: userId,
      subscription_id: null,
    });

  if (redemptionError) {
    console.error('[store-promo] redemption insert:', redemptionError);
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
}
