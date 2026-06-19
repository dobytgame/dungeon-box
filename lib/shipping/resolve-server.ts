import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanSlug } from '@/lib/checkout/plans';
import {
  promoGrantsFreeShipping,
  resolvePromoCode,
} from '@/lib/checkout/promo-codes';
import {
  applyFreeShippingToQuote,
  quoteShipping,
  ShippingQuoteError,
} from '@/lib/shipping/quote';
import type { ShippingQuote } from '@/lib/shipping/types';

export type ResolveShippingOptions = {
  couponCode?: string | null;
  /** Cliente com acesso à tabela promo_codes (ex.: service role). */
  promoSupabase?: SupabaseClient;
};

export async function resolveShippingForCheckout(
  supabase: SupabaseClient,
  userId: string,
  planSlug: PlanSlug,
  addressId: string,
  options?: ResolveShippingOptions
): Promise<ShippingQuote> {
  const { data: plan } = await supabase
    .from('plans')
    .select('freight_free, freight_regions, price_cents')
    .eq('slug', planSlug)
    .eq('is_active', true)
    .single();

  if (!plan) {
    throw new ShippingQuoteError('Plano não encontrado.');
  }

  const { data: address } = await supabase
    .from('addresses')
    .select('zip_code, state')
    .eq('id', addressId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!address) {
    throw new ShippingQuoteError('Endereço de entrega inválido.');
  }

  let quote = quoteShipping(
    {
      freight_free: plan.freight_free,
      freight_regions: plan.freight_regions,
    },
    { zip_code: address.zip_code, state: address.state }
  );

  const couponCode = options?.couponCode?.trim();
  if (couponCode && options?.promoSupabase) {
    try {
      const resolved = await resolvePromoCode(
        options.promoSupabase,
        couponCode,
        planSlug,
        userId,
        plan.price_cents
      );
      if (promoGrantsFreeShipping(resolved.promo)) {
        quote = applyFreeShippingToQuote(quote, `cupom ${resolved.promo.code}`);
      }
    } catch {
      // Cupom pode não valer para este plano; mantém frete calculado.
    }
  }

  return quote;
}
