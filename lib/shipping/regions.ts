import type { ShippingRegion } from './types';

const UF_TO_REGION: Record<string, ShippingRegion> = {
  RS: 'sul',
  SC: 'sul',
  PR: 'sul',
  SP: 'sudeste',
  RJ: 'sudeste',
  MG: 'sudeste',
  ES: 'sudeste',
  MT: 'centro-oeste',
  MS: 'centro-oeste',
  GO: 'centro-oeste',
  DF: 'centro-oeste',
  MA: 'nordeste',
  PI: 'nordeste',
  CE: 'nordeste',
  RN: 'nordeste',
  PB: 'nordeste',
  PE: 'nordeste',
  AL: 'nordeste',
  SE: 'nordeste',
  BA: 'nordeste',
  AM: 'norte',
  RR: 'norte',
  AP: 'norte',
  PA: 'norte',
  TO: 'norte',
  RO: 'norte',
  AC: 'norte',
};

const REGION_LABELS: Record<ShippingRegion, string> = {
  sul: 'Sul',
  sudeste: 'Sudeste',
  'centro-oeste': 'Centro-Oeste',
  nordeste: 'Nordeste',
  norte: 'Norte',
};

export function normalizeState(state: string): string {
  return state.trim().toUpperCase().slice(0, 2);
}

export function regionFromState(state: string): ShippingRegion | null {
  return UF_TO_REGION[normalizeState(state)] ?? null;
}

export function regionLabel(region: ShippingRegion): string {
  return REGION_LABELS[region];
}

export function isFreightFreeForRegion(
  plan: { freight_free: boolean; freight_regions: string[] | null },
  region: ShippingRegion
): boolean {
  if (!plan.freight_free) return false;
  const regions = plan.freight_regions ?? [];
  if (regions.includes('all')) return true;
  return regions.includes(region);
}
