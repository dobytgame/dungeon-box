import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getStoreProduct,
  type StoreProduct,
} from '@/lib/store/catalog';
import { getStoreProductBySlugFromDb } from '@/lib/store/load-catalog';

export async function resolveStoreProductForCheckout(
  admin: SupabaseClient,
  productId: string
): Promise<StoreProduct | null> {
  const staticProduct = getStoreProduct(productId);
  if (staticProduct) return staticProduct;

  return getStoreProductBySlugFromDb(admin, productId);
}
