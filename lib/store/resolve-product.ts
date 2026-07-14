import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getStoreProduct,
  type StoreProduct,
} from '@/lib/store/catalog';
import { getStoreProductBySlugFromDb } from '@/lib/store/load-catalog';
import { enrichStoreProductForSubscriber } from '@/lib/store/subscriber-discount';

export async function resolveStoreProductForCheckout(
  admin: SupabaseClient,
  productId: string,
  options?: {
    userId?: string;
    userSupabase?: SupabaseClient;
  }
): Promise<StoreProduct | null> {
  const staticProduct = getStoreProduct(productId);
  const product =
    staticProduct ?? (await getStoreProductBySlugFromDb(admin, productId));

  if (!product || !options?.userId || !options.userSupabase) {
    return product;
  }

  return enrichStoreProductForSubscriber(
    options.userSupabase,
    options.userId,
    product
  );
}
