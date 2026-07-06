import { quoteShipping } from '@/lib/shipping/quote';
import type { PlanFreightRules, ShippingAddressInput } from '@/lib/shipping/types';

/** Pedidos avulsos da loja usam tabela fixa por região (sem frete grátis de plano). */
const STORE_STANDALONE_FREIGHT: PlanFreightRules = {
  freight_free: false,
  freight_regions: null,
};

export function quoteStoreStandaloneShipping(address: ShippingAddressInput) {
  return quoteShipping(STORE_STANDALONE_FREIGHT, address);
}

export function storeOrderNeedsStandaloneShipping(
  shippingMode: 'with_subscription' | 'standalone'
): boolean {
  return shippingMode === 'standalone';
}
