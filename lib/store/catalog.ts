import { PAINT_KIT_BUMPS } from '@/lib/checkout/order-bumps';
import type { StoreProductVariation } from '@/lib/store/product-variations';
import type { StoreKitTheme } from '@/lib/store/kit-themes';

export type StoreCatalogProductId = 'paint-kit-amador' | 'paint-kit-profissional';

export type StoreProductId = StoreCatalogProductId | string;

export type StoreProductCategory = 'paint-kit' | 'monthly-kit' | 'store-item';

export const STORE_PRODUCT_CATEGORY_LABELS: Record<StoreProductCategory, string> = {
  'paint-kit': 'Kit de pintura',
  'monthly-kit': 'Kit avulso (plano)',
  'store-item': 'Produto da loja',
};

export function isPaintKitCategory(category: StoreProductCategory): boolean {
  return category === 'paint-kit';
}

export function isMonthlyKitCategory(category: StoreProductCategory): boolean {
  return category === 'monthly-kit';
}

export function productRequiresKitTheme(product: {
  category: StoreProductCategory;
  kitThemes?: StoreKitTheme[];
}): boolean {
  return product.category === 'monthly-kit' && (product.kitThemes?.length ?? 0) > 0;
}

export function isStoreItemCategory(category: StoreProductCategory): boolean {
  return category === 'store-item';
}

export type StoreProduct = {
  id: StoreProductId;
  slug: string;
  name: string;
  tagline: string;
  priceCents: number;
  priceLabel: string;
  includes: readonly string[];
  featured?: boolean;
  category: StoreProductCategory;
  storeCategorySlug?: string;
  storeCategoryName?: string;
  storeParentCategorySlug?: string;
  storeParentCategoryName?: string;
  imageUrl?: string;
  galleryUrls?: string[];
  pageContentHtml?: string;
  /** ID interno usado em special_notes da assinatura */
  paintKitBumpId?: 'amador' | 'profissional';
  subscriberOnly?: boolean;
  requiresSubscriptionBundle?: boolean;
  subscriptionId?: string;
  themeId?: string;
  themeName?: string;
  themeEmoji?: string | null;
  planName?: string;
  planSlug?: string;
  kitThemes?: StoreKitTheme[];
  maxQuantity?: number;
  minQuantity?: number;
  /** Exige 1 imagem de referência por unidade no carrinho. */
  requiresUnitUploads?: boolean;
  originalPriceCents?: number;
  promoCode?: string;
  promoSummary?: string;
  /** Percentual configurado no admin (null/undefined = 5% padrão). */
  subscriberDiscountPercent?: number | null;
  /**
   * Preço fixo para assinantes (ex.: kits do mês = `plans.price_cents`).
   * Quando definido, prevalece sobre o desconto percentual.
   */
  subscriberPriceCents?: number;
  subscriberDiscount?: boolean;
  /** Percentual efetivamente aplicado após enriquecimento para assinante. */
  subscriberDiscountAppliedPercent?: number;
  variationsEnabled?: boolean;
  variations?: StoreProductVariation[];
  storeCategoryId?: string;
};

export type { StoreProductVariation } from '@/lib/store/product-variations';

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
    maxQuantity: 9,
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
    maxQuantity: 9,
  },
];

export function isStoreCatalogProductId(
  id: string
): id is StoreCatalogProductId {
  return STORE_PRODUCTS.some((product) => product.id === id);
}

export function getStoreProduct(id: StoreProductId): StoreProduct | undefined {
  return STORE_PRODUCTS.find((product) => product.id === id);
}

export function getStoreProductBySlug(slug: string): StoreProduct | undefined {
  return STORE_PRODUCTS.find((product) => product.slug === slug);
}
