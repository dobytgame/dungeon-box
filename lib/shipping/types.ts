export type ShippingRegion =
  | 'sul'
  | 'sudeste'
  | 'centro-oeste'
  | 'nordeste'
  | 'norte';

export type ShippingQuote = {
  cents: number;
  free: boolean;
  region: ShippingRegion;
  regionLabel: string;
  label: string;
  etaDaysMin: number;
  etaDaysMax: number;
};

export type PlanFreightRules = {
  freight_free: boolean;
  freight_regions: string[] | null;
};

export type ShippingAddressInput = {
  zip_code: string;
  state: string;
};
