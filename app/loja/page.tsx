import Link from 'next/link';
import ShopCategorySlider from '@/components/shop/ShopCategorySlider';
import ShopHero from '@/components/shop/ShopHero';
import ShopHeroSlider from '@/components/shop/ShopHeroSlider';
import ShopIntermediateBanner from '@/components/shop/ShopIntermediateBanner';
import ShopProductGrid from '@/components/shop/ShopProductGrid';
import ShopSubscriptionBanner from '@/components/shop/ShopSubscriptionBanner';
import StoreProductCard from '@/components/store/StoreProductCard';
import { planSupportCopy } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  filterPublicStoreCategories,
  filterPublicStoreProducts,
  isStorePublic,
  profileIsStoreAdmin,
} from '@/lib/store/access';
import { loadActiveStoreBanners } from '@/lib/store/banners';
import {
  loadActivePaintKitProducts,
  loadActiveStoreCategories,
  loadFeaturedProducts,
  loadNewestProducts,
} from '@/lib/store/load-catalog';
import {
  getMonthlyKitStoreAvailability,
  getPublicMonthlyKitProducts,
} from '@/lib/store/monthly-kits';
import { STORE_ROUTES } from '@/lib/store/routes';

function MonthlyKitEmptyState({
  issue,
}: {
  issue?: 'no_subscription' | 'no_theme' | 'no_plan';
}) {
  if (issue === 'no_subscription') {
    return (
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-sm border border-ember/20 bg-ember/[0.04] p-5">
          <p className="text-sm text-stone-300">
            O kit do mês extra é exclusivo para assinantes.{' '}
            <Link href="/#planos" className="text-ember hover:underline">
              Assine um plano
            </Link>{' '}
            para comprar cópias adicionais do tema corrente.
          </p>
        </div>
      </section>
    );
  }

  if (issue === 'no_theme') {
    return (
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-sm border border-white/[0.06] bg-stone-950/40 p-5">
          <p className="text-sm text-stone-400">
            Ainda não há um tema do mês configurado para venda extra. Nossa equipe
            está preparando o próximo kit — volte em breve.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="rounded-sm border border-white/[0.06] bg-stone-950/40 p-5">
        <p className="text-sm text-stone-400">
          Não encontramos o plano vinculado à sua assinatura. Atualize seus dados
          em{' '}
          <Link href="/dashboard/subscription" className="text-ember hover:underline">
            Minha assinatura
          </Link>{' '}
          ou fale com o suporte.
        </p>
      </div>
    </section>
  );
}

export default async function LojaHomePage() {
  const supabase = createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = user ? await profileIsStoreAdmin(supabase, user.id) : false;
  const showFullCatalog = isStorePublic() || isAdmin;

  const [categories, banners, monthlyKitStore, publicMonthlyKits, paintKitProducts, featured, newest] =
    await Promise.all([
      loadActiveStoreCategories(admin),
      loadActiveStoreBanners(admin),
      showFullCatalog && user
        ? getMonthlyKitStoreAvailability(user.id, supabase)
        : Promise.resolve({
            products: [],
            hasEligibleSubscription: false,
            hasTheme: false,
            issue: 'no_subscription' as const,
          }),
      getPublicMonthlyKitProducts(admin),
      loadActivePaintKitProducts(admin),
      showFullCatalog ? loadFeaturedProducts(admin) : Promise.resolve([]),
      showFullCatalog ? loadNewestProducts(admin) : Promise.resolve([]),
    ]);

  const planKits =
    showFullCatalog && monthlyKitStore.products.length > 0
      ? monthlyKitStore.products
      : publicMonthlyKits;

  const visibleCategories = showFullCatalog
    ? categories
    : filterPublicStoreCategories(categories);
  const visiblePaintKits = showFullCatalog
    ? paintKitProducts
    : filterPublicStoreProducts(paintKitProducts);
  const showSubscriberMonthlyKits =
    showFullCatalog && monthlyKitStore.products.length > 0;

  return (
    <>
      {banners.length > 0 ? (
        <ShopHeroSlider banners={banners} />
      ) : (
        <ShopHero />
      )}
      <ShopCategorySlider categories={visibleCategories} />

      <div id="produtos">
        {planKits.length > 0 ? (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
            <div className="mb-8">
              <p className="font-display text-xs uppercase tracking-[0.25em] text-ember">
                {showSubscriberMonthlyKits ? 'Exclusivo assinantes' : 'Planos'}
              </p>
              <h2 className="mt-2 font-display text-2xl uppercase tracking-wide text-white sm:text-3xl">
                {showSubscriberMonthlyKits ? 'Kit do mês' : 'Kits avulsos'}
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-stone-400">
                {showSubscriberMonthlyKits
                  ? `${planSupportCopy.heroSubtitle} Compre cópias extras de qualquer plano — enviadas junto com a próxima caixa, sem frete.`
                  : 'Escolha qualquer plano e receba o kit do tema do mês em casa. Compra avulsa com frete calculado no checkout.'}
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {planKits.map((product) => (
                <StoreProductCard key={product.id} product={product} />
              ))}
            </div>
            {!showSubscriberMonthlyKits ? (
              <p className="mt-6 text-sm text-stone-500">
                Prefere receber todo mês?{' '}
                <Link href="/#planos" className="text-ember hover:underline">
                  Assine um plano
                </Link>{' '}
                e economize no frete recorrente.
              </p>
            ) : null}
          </section>
        ) : showFullCatalog ? (
          <div className="py-10">
            <MonthlyKitEmptyState issue={monthlyKitStore.issue} />
          </div>
        ) : null}

        <ShopProductGrid
          eyebrow="Acessórios"
          title="Kits de pintura"
          products={visiblePaintKits}
          viewAllHref={STORE_ROUTES.category('kits-pintura')}
        />

        {showFullCatalog ? (
          <>
            <ShopProductGrid
              eyebrow="Destaque"
              title="Produtos em destaque"
              products={featured}
            />

            <ShopIntermediateBanner />

            <ShopProductGrid
              eyebrow="Novidades"
              title="Recém adicionados"
              products={newest}
            />
          </>
        ) : null}
      </div>

      <ShopSubscriptionBanner />
    </>
  );
}
