import type { Metadata } from 'next';
import { StoreCartProvider } from '@/components/store/StoreCartProvider';
import { StoreCatalogProvider } from '@/components/store/StoreCatalogProvider';
import ShopShell from '@/components/shop/ShopShell';
import { displayName, getProfile } from '@/lib/dashboard/queries';
import { buildOpenGraph, buildRobots, buildTwitterCard } from '@/lib/seo/metadata';
import {
  filterPublicStoreCategories,
  filterPublicStoreProducts,
  isStoreLinkVisible,
  isStorePublic,
} from '@/lib/store/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { loadActiveStoreCategories, loadAllActiveStoreProducts, filterStoreProductsForVitrine } from '@/lib/store/load-catalog';
import { getMonthlyKitProductsForUser, getPublicMonthlyKitProducts } from '@/lib/store/monthly-kits';
import { enrichStoreProductsForSubscriber } from '@/lib/store/subscriber-discount';

export const metadata: Metadata = {
  title: 'Loja | DungeonBox',
  description:
    'Kits de pintura, acessórios e extras para sua mesa de RPG. Complemente sua dungeon com a mesma qualidade da assinatura.',
  robots: buildRobots(isStoreLinkVisible()),
  openGraph: buildOpenGraph({
    title: 'Loja DungeonBox — Extras para sua mesa de RPG',
    description:
      'Kits de pintura e acessórios para complementar sua dungeon modular.',
    path: '/loja',
  }),
  twitter: buildTwitterCard({
    title: 'Loja DungeonBox',
    description: 'Extras e acessórios para sua mesa de RPG.',
  }),
};

export default async function LojaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const showFullCatalog = isStorePublic();

  const [profile, publicMonthlyKits, userBundleMonthlyKits, categories, catalogProducts] =
    await Promise.all([
      user ? getProfile(user.id) : Promise.resolve(null),
      getPublicMonthlyKitProducts(admin),
      isStorePublic()
        ? user
          ? getMonthlyKitProductsForUser(user.id, supabase)
          : Promise.resolve([])
        : Promise.resolve([]),
      loadActiveStoreCategories(admin),
      loadAllActiveStoreProducts(admin),
    ]);

  const monthlyKits = (() => {
    const byId = new Map<string, (typeof publicMonthlyKits)[number]>();
    for (const product of publicMonthlyKits) {
      byId.set(product.id, product);
    }
    // Kits com envio na assinatura (e cupom vinculado) prevalecem para assinantes.
    for (const product of userBundleMonthlyKits) {
      byId.set(product.id, product);
    }
    return Array.from(byId.values());
  })();

  const [visibleCatalogProducts, visibleMonthlyKits] = await Promise.all([
    filterStoreProductsForVitrine(admin, catalogProducts),
    filterStoreProductsForVitrine(admin, monthlyKits),
  ]);

  const [subscriberCatalogProducts, subscriberMonthlyKits] = await Promise.all([
    enrichStoreProductsForSubscriber(supabase, user?.id, visibleCatalogProducts),
    enrichStoreProductsForSubscriber(supabase, user?.id, visibleMonthlyKits),
  ]);

  const visibleCategories = isStorePublic()
    ? categories
    : filterPublicStoreCategories(categories);
  const visibleProducts = isStorePublic()
    ? subscriberCatalogProducts
    : filterPublicStoreProducts(subscriberCatalogProducts);

  const userName = user ? displayName(profile, user.email) : null;

  return (
    <StoreCatalogProvider monthlyKits={subscriberMonthlyKits} catalogProducts={visibleProducts}>
      <StoreCartProvider>
        <ShopShell
          categories={visibleCategories}
          isLoggedIn={!!user}
          userName={userName}
        >
          {children}
        </ShopShell>
      </StoreCartProvider>
    </StoreCatalogProvider>
  );
}
