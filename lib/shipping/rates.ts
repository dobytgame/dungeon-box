import type { ShippingRegion } from './types';

/** Valores em centavos (BRL) por região — ajuste conforme tabela dos Correios/transportadora. */
export const SHIPPING_RATES_CENTS: Record<ShippingRegion, number> = {
  sul: 1890,
  sudeste: 1990,
  'centro-oeste': 2490,
  nordeste: 2790,
  norte: 3290,
};

export const SHIPPING_ETA_DAYS: Record<
  ShippingRegion,
  { min: number; max: number }
> = {
  sul: { min: 10, max: 15 },
  sudeste: { min: 10, max: 15 },
  'centro-oeste': { min: 15, max: 20 },
  nordeste: { min: 15, max: 20 },
  norte: { min: 18, max: 25 },
};
