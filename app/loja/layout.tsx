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
  profileIsStoreAdmin,
} from '@/lib/store/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { loadActiveStoreCategories, loadAllActiveStoreProducts } from '@/lib/store/load-catalog';
import { getMonthlyKitProductsForUser, getPublicMonthlyKitProducts } from '@/lib/store/monthly-kits';

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

  const isAdmin = user ? await profileIsStoreAdmin(supabase, user.id) : false;

  const [profile, publicMonthlyKits, subscriberMonthlyKits, categories, catalogProducts] =
    await Promise.all([
      user ? getProfile(user.id) : Promise.resolve(null),
      getPublicMonthlyKitProducts(admin),
      isStorePublic() || isAdmin
        ? user
          ? getMonthlyKitProductsForUser(user.id, supabase)
          : Promise.resolve([])
        : Promise.resolve([]),
      loadActiveStoreCategories(admin),
      loadAllActiveStoreProducts(admin),
    ]);

  const monthlyKits = (() => {
    const byId = new Map<string, (typeof publicMonthlyKits)[number]>();
    for (const product of subscriberMonthlyKits) {
      byId.set(product.id, product);
    }
    for (const product of publicMonthlyKits) {
      byId.set(product.id, product);
    }
    // Compra avulsa (frete no checkout) prevalece sobre envio com assinatura.
    for (const product of publicMonthlyKits) {
      if (!product.requiresSubscriptionBundle) {
        byId.set(product.id, product);
      }
    }
    return Array.from(byId.values());
  })();

  const visibleCategories =
    isStorePublic() || isAdmin
      ? categories
      : filterPublicStoreCategories(categories);
  const visibleProducts =
    isStorePublic() || isAdmin
      ? catalogProducts
      : filterPublicStoreProducts(catalogProducts);

  const userName = user ? displayName(profile, user.email) : null;

  return (
    <StoreCatalogProvider monthlyKits={monthlyKits} catalogProducts={visibleProducts}>
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
