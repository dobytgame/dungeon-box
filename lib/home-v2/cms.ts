import { getPublicTestimonials } from '@/lib/feedback/public';
import { createAdminClient } from '@/lib/supabase/admin';
import { filterPublicStoreProducts } from '@/lib/store/access';
import type { StoreProduct } from '@/lib/store/catalog';
import { isPaintKitCategory } from '@/lib/store/catalog';
import {
  getCachedFeaturedProducts,
  getCachedNewestProducts,
} from '@/lib/store/cached-catalog';
import { getCurrentMonthlyTheme } from '@/lib/store/monthly-kits';
import { STORE_ROUTES } from '@/lib/store/routes';
import { HOME_V2_COPY, type HomeV2MonthlyDungeon, type HomeV2StoreProduct, type HomeV2Testimonial } from '@/lib/home-v2/content';

const STORE_SHELF_SIZE = 4;
const TESTIMONIALS_LIMIT = 24;

function toStoreShelfProduct(product: StoreProduct): HomeV2StoreProduct {
  const imageSrc = product.imageUrl ?? product.galleryUrls?.[0];
  return {
    sku: product.slug,
    name: product.name,
    category: product.storeCategoryName,
    priceCents: product.priceCents,
    priceLabel: product.priceLabel,
    image: imageSrc
      ? { src: imageSrc, alt: product.name }
      : undefined,
    productUrl: STORE_ROUTES.product(product.slug),
    compatibleWithSubscription: !isPaintKitCategory(product.category),
  };
}

export async function getHomeV2StoreProducts(): Promise<HomeV2StoreProduct[]> {
  const [featured, newest] = await Promise.all([
    getCachedFeaturedProducts(),
    getCachedNewestProducts(),
  ]);

  const seen = new Set<string>();
  const merged: StoreProduct[] = [];

  for (const product of [...featured, ...newest]) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    merged.push(product);
  }

  return filterPublicStoreProducts(merged)
    .slice(0, STORE_SHELF_SIZE)
    .map(toStoreShelfProduct);
}

export async function getHomeV2MonthlyDungeon(): Promise<HomeV2MonthlyDungeon> {
  const admin = createAdminClient();
  const theme = await getCurrentMonthlyTheme(admin);
  const revealed = Boolean(theme?.is_revealed && theme.name);

  if (!theme) {
    return {
      title: HOME_V2_COPY.monthly.fallbackTitle,
      lore: HOME_V2_COPY.monthly.comingSoonLore,
      status: 'coming_soon',
      highlights: [...HOME_V2_COPY.monthly.highlightsSoon],
    };
  }

  const heroMedia = theme.image_url
    ? {
        src: theme.image_url,
        alt: `Cenário do tema ${theme.name}`,
      }
    : undefined;

  return {
    title: revealed ? theme.name : HOME_V2_COPY.monthly.fallbackTitle,
    lore:
      revealed && theme.lore?.trim()
        ? theme.lore.trim()
        : HOME_V2_COPY.monthly.comingSoonLore,
    status: revealed ? 'revealed' : 'coming_soon',
    heroMedia,
    detailMedia: heroMedia,
    highlights: revealed
      ? [...HOME_V2_COPY.monthly.highlightsRevealed]
      : [...HOME_V2_COPY.monthly.highlightsSoon],
  };
}

export async function getHomeV2Testimonials(): Promise<HomeV2Testimonial[]> {
  const testimonials = await getPublicTestimonials(TESTIMONIALS_LIMIT);

  return testimonials
    .map((item) => ({
      id: item.id,
      quote: item.message.trim(),
      name: item.name,
      context: item.themeName ?? undefined,
      rating: Math.min(5, Math.max(1, Math.round(item.rating))),
      imageUrls: item.imageUrls,
    }))
    .sort((a, b) => Number(b.imageUrls.length > 0) - Number(a.imageUrls.length > 0));
}
