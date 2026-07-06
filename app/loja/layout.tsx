import type { Metadata } from 'next';
import { StoreCartProvider } from '@/components/store/StoreCartProvider';
import { StoreCatalogProvider } from '@/components/store/StoreCatalogProvider';
import ShopShell from '@/components/shop/ShopShell';
import { displayName, getProfile } from '@/lib/dashboard/queries';
import { buildOpenGraph, buildRobots, buildTwitterCard } from '@/lib/seo/metadata';
import { isStorePublic } from '@/lib/store/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { loadActiveStoreCategories, loadAllActiveStoreProducts } from '@/lib/store/load-catalog';
import { getMonthlyKitProductsForUser } from '@/lib/store/monthly-kits';

export const metadata: Metadata = {
  title: 'Loja | DungeonBox',
  description:
    'Kits de pintura, acessórios e extras para sua mesa de RPG. Complemente sua dungeon com a mesma qualidade da assinatura.',
  robots: buildRobots(isStorePublic()),
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

  const [profile, monthlyKits, categories, catalogProducts] = await Promise.all([
    user ? getProfile(user.id) : Promise.resolve(null),
    user ? getMonthlyKitProductsForUser(user.id, supabase) : Promise.resolve([]),
    loadActiveStoreCategories(admin),
    loadAllActiveStoreProducts(admin),
  ]);

  const userName = user ? displayName(profile, user.email) : null;

  return (
    <StoreCatalogProvider monthlyKits={monthlyKits} catalogProducts={catalogProducts}>
      <StoreCartProvider>
        <ShopShell
          categories={categories}
          isLoggedIn={!!user}
          userName={userName}
        >
          {children}
        </ShopShell>
      </StoreCartProvider>
    </StoreCatalogProvider>
  );
}
