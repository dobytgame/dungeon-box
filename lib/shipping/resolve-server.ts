import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanSlug } from '@/lib/checkout/plans';
import { quoteShipping, ShippingQuoteError } from '@/lib/shipping/quote';
import type { ShippingQuote } from '@/lib/shipping/types';

export async function resolveShippingForCheckout(
  supabase: SupabaseClient,
  userId: string,
  planSlug: PlanSlug,
  addressId: string
): Promise<ShippingQuote> {
  const { data: plan } = await supabase
    .from('plans')
    .select('freight_free, freight_regions')
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

  return quoteShipping(
    {
      freight_free: plan.freight_free,
      freight_regions: plan.freight_regions,
    },
    { zip_code: address.zip_code, state: address.state }
  );
}
