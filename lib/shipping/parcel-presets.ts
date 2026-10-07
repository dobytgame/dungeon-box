export type ParcelPreset = {
  weightKg: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
};

/** Caixa única de envio: altura × largura × comprimento. */
export const SHIPPING_PARCEL: ParcelPreset = {
  weightKg: 0.5,
  heightCm: 12,
  widthCm: 22,
  lengthCm: 31,
};
