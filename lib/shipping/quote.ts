import {
  isFreightFreeForRegion,
  regionFromState,
  regionLabel,
} from './regions';
import { SHIPPING_ETA_DAYS, SHIPPING_RATES_CENTS } from './rates';
import type {
  PlanFreightRules,
  ShippingAddressInput,
  ShippingQuote,
} from './types';

export class ShippingQuoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShippingQuoteError';
  }
}

export function quoteShipping(
  plan: PlanFreightRules,
  address: ShippingAddressInput
): ShippingQuote {
  const region = regionFromState(address.state);
  if (!region) {
    throw new ShippingQuoteError('UF inválida para cálculo de frete.');
  }

  const zipDigits = address.zip_code.replace(/\D/g, '');
  if (zipDigits.length !== 8) {
    throw new ShippingQuoteError('CEP inválido para cálculo de frete.');
  }

  const free = isFreightFreeForRegion(plan, region);
  const cents = free ? 0 : SHIPPING_RATES_CENTS[region];
  const eta = SHIPPING_ETA_DAYS[region];
  const regionName = regionLabel(region);

  return {
    cents,
    free,
    region,
    regionLabel: regionName,
    label: free
      ? `Frete grátis (${regionName})`
      : `Frete para ${regionName}`,
    etaDaysMin: eta.min,
    etaDaysMax: eta.max,
  };
}

export function formatShippingBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
