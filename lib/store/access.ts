import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoreProductCategory } from '@/lib/store/catalog';
import type { StoreCategory } from '@/lib/store/load-catalog';

/** Quando true, toda a vitrine e APIs da loja ficam abertas. */
export function isStorePublic(): boolean {
  return process.env.STORE_PUBLIC === 'true';
}

/** Categorias de vitrine visíveis mesmo com a loja fechada. */
export const PUBLIC_STORE_CATEGORY_SLUGS = ['kits-pintura'] as const;

/** Tipos de produto compráveis na vitrine limitada. */
export const PUBLIC_STORE_PRODUCT_CATEGORIES: readonly StoreProductCategory[] = [
  'paint-kit',
];

const PUBLIC_STORE_PATHS = new Set([
  '/loja',
  '/loja/carrinho',
  '/loja/checkout',
  '/loja/sucesso',
]);

export type PublicStoreProductRef = {
  category: StoreProductCategory;
  storeCategorySlug?: string | null;
  slug?: string;
};

/** Link da loja no site (navbar, footer, dashboard). */
export function isStoreLinkVisible(): boolean {
  return isStorePublic() || hasPublicStoreCatalog();
}

/** Há seções públicas da loja (kits de pintura) mesmo com STORE_PUBLIC=false. */
export function hasPublicStoreCatalog(): boolean {
  return true;
}

export function isPublicStoreProductCategory(
  category: StoreProductCategory
): boolean {
  return (PUBLIC_STORE_PRODUCT_CATEGORIES as readonly string[]).includes(category);
}

export function isPublicStoreCategorySlug(slug: string): boolean {
  return (PUBLIC_STORE_CATEGORY_SLUGS as readonly string[]).includes(slug);
}

export function isPublicStoreProduct(product: PublicStoreProductRef): boolean {
  if (isStorePublic()) return true;
  if (isPublicStoreProductCategory(product.category)) return true;
  if (
    product.storeCategorySlug &&
    isPublicStoreCategorySlug(product.storeCategorySlug)
  ) {
    return true;
  }
  return false;
}

export function filterPublicStoreCategories(
  categories: StoreCategory[]
): StoreCategory[] {
  if (isStorePublic()) return categories;
  return categories.filter((category) => isPublicStoreCategorySlug(category.slug));
}

export function filterPublicStoreProducts<T extends PublicStoreProductRef>(
  products: T[]
): T[] {
  if (isStorePublic()) return products;
  return products.filter((product) => isPublicStoreProduct(product));
}

export function canBrowseStorePath(pathname: string, isAdmin: boolean): boolean {
  if (isStorePublic() || isAdmin) return true;

  if (PUBLIC_STORE_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/loja/sucesso')) return true;

  const categoryMatch = pathname.match(/^\/loja\/([^/]+)$/);
  if (categoryMatch) {
    return isPublicStoreCategorySlug(categoryMatch[1]!);
  }

  if (pathname.startsWith('/loja/produto/')) {
    return true;
  }

  return false;
}

export async function profileIsStoreAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  return profile?.is_admin === true;
}

export async function userCanAccessStore(
  supabase: SupabaseClient,
  userId: string | null | undefined
): Promise<boolean> {
  if (isStorePublic()) return true;
  if (hasPublicStoreCatalog()) return true;
  if (!userId) return false;
  return profileIsStoreAdmin(supabase, userId);
}

export type StoreAccessDenied = { allowed: false; status: 401 | 403 };
export type StoreAccessGranted = { allowed: true };

export async function assertStoreAccessForApi(
  supabase: SupabaseClient,
  userId: string | null | undefined
): Promise<StoreAccessGranted | StoreAccessDenied> {
  if (isStorePublic()) return { allowed: true };
  if (hasPublicStoreCatalog() && userId) return { allowed: true };
  if (!userId) return { allowed: false, status: 401 };
  const isAdmin = await profileIsStoreAdmin(supabase, userId);
  if (!isAdmin) return { allowed: false, status: 403 };
  return { allowed: true };
}

export async function assertPublicStoreCheckoutItems(
  admin: SupabaseClient,
  productIds: string[]
): Promise<{ allowed: true } | { error: string }> {
  if (isStorePublic()) return { allowed: true };

  const { resolveStoreProductForCheckout } = await import('@/lib/store/resolve-product');

  for (const productId of productIds) {
    if (productId.startsWith('monthly-kit:')) {
      return { error: 'Este produto não está disponível no momento.' };
    }

    const product = await resolveStoreProductForCheckout(admin, productId);
    if (!product) {
      return { error: 'Produto inválido no carrinho.' };
    }

    if (!isPublicStoreProduct(product)) {
      return { error: 'Este produto não está disponível no momento.' };
    }
  }

  return { allowed: true };
}
