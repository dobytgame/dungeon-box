import { PAINT_KIT_BUMPS } from '@/lib/checkout/order-bumps';

export type StoreProductId = 'paint-kit-amador' | 'paint-kit-profissional';

export type StoreProduct = {
  id: StoreProductId;
  slug: string;
  name: string;
  tagline: string;
  priceCents: number;
  priceLabel: string;
  includes: readonly string[];
  featured?: boolean;
  category: 'paint-kit';
  /** ID interno usado em special_notes da assinatura */
  paintKitBumpId?: 'amador' | 'profissional';
};

export const STORE_PRODUCTS: StoreProduct[] = [
  {
    id: 'paint-kit-amador',
    slug: 'kit-pintura-amador',
    name: PAINT_KIT_BUMPS[0].name,
    tagline: PAINT_KIT_BUMPS[0].tagline,
    priceCents: PAINT_KIT_BUMPS[0].priceCents,
    priceLabel: PAINT_KIT_BUMPS[0].priceLabel,
    includes: PAINT_KIT_BUMPS[0].includes,
    category: 'paint-kit',
    paintKitBumpId: 'amador',
  },
  {
    id: 'paint-kit-profissional',
    slug: 'kit-pintura-profissional',
    name: PAINT_KIT_BUMPS[1].name,
    tagline: PAINT_KIT_BUMPS[1].tagline,
    priceCents: PAINT_KIT_BUMPS[1].priceCents,
    priceLabel: PAINT_KIT_BUMPS[1].priceLabel,
    includes: PAINT_KIT_BUMPS[1].includes,
    featured: true,
    category: 'paint-kit',
    paintKitBumpId: 'profissional',
  },
];

export function getStoreProduct(id: StoreProductId): StoreProduct | undefined {
  return STORE_PRODUCTS.find((product) => product.id === id);
}

export function getStoreProductBySlug(slug: string): StoreProduct | undefined {
  return STORE_PRODUCTS.find((product) => product.slug === slug);
}
