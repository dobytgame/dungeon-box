import Link from 'next/link';
import ShopCategorySlider from '@/components/shop/ShopCategorySlider';
import ShopHero from '@/components/shop/ShopHero';
import ShopHeroSlider from '@/components/shop/ShopHeroSlider';
import ShopIntermediateBanner from '@/components/shop/ShopIntermediateBanner';
import ShopProductGrid, { ShopProductList } from '@/components/shop/ShopProductGrid';
import ShopSection from '@/components/shop/ShopSection';
import ShopProductSlider from '@/components/shop/ShopProductSlider';
import ShopSubscriptionBanner from '@/components/shop/ShopSubscriptionBanner';
import { planSupportCopy } from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  filterPublicStoreCategories,
  filterPublicStoreProducts,
  isStorePublic,
} from '@/lib/store/access';
import {
  getCachedActiveStoreBanners,
  getCachedActiveStoreCategories,
  getCachedFeaturedProducts,
  getCachedNewestProducts,
  getCachedPaintKitProducts,
  getCachedPublicMonthlyKitProducts,
} from '@/lib/store/cached-catalog';
import {
  filterStoreProductsForVitrine,
} from '@/lib/store/load-catalog';
import {
  getMonthlyKitStoreAvailability,
} from '@/lib/store/monthly-kits';
import { enrichStoreProductsForSubscriber } from '@/lib/store/subscriber-discount';
import { STORE_ROUTES } from '@/lib/store/routes';

const inlineLinkClass =
  'font-semibold text-mesa-parchment underline decoration-mesa-ember/60 underline-offset-4 transition-colors hover:decoration-mesa-ember';

function EmptyStateCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-6xl items-start gap-4 rounded-2xl border border-white/10 bg-mesa-stone p-5 sm:p-6">
      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-mesa-jade" aria-hidden="true" />
      <p className="text-sm leading-relaxed text-mesa-ash sm:text-base">{children}</p>
    </div>
  );
}

function MonthlyKitEmptyState({
  issue,
}: {
  issue?: 'no_subscription' | 'no_theme' | 'no_plan';
}) {
  if (issue === 'no_subscription') {
    return (
      <EmptyStateCard>
        O kit do mês extra é exclusivo para assinantes.{' '}
        <Link href="/#planos" className={inlineLinkClass}>
          Assine um plano
        </Link>{' '}
        para comprar cópias adicionais do tema corrente.
      </EmptyStateCard>
    );
  }

  if (issue === 'no_theme') {
    return (
      <EmptyStateCard>
        Ainda não há um tema do mês configurado para venda extra. Nossa equipe está preparando o
        próximo kit — volte em breve.
      </EmptyStateCard>
    );
  }

  return (
    <EmptyStateCard>
      Não encontramos o plano vinculado à sua assinatura. Atualize seus dados em{' '}
      <Link href="/dashboard/subscription" className={inlineLinkClass}>
        Minha assinatura
      </Link>{' '}
      ou fale com o suporte.
    </EmptyStateCard>
  );
}

export default async function LojaHomePage() {
  const supabase = createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const showFullCatalog = isStorePublic();

  const [categories, banners, monthlyKitStore, publicMonthlyKits, paintKitProducts, featured, newest] =
    await Promise.all([
      getCachedActiveStoreCategories(),
      getCachedActiveStoreBanners(),
      showFullCatalog && user
        ? getMonthlyKitStoreAvailability(user.id, supabase)
        : Promise.resolve({
            products: [],
            hasEligibleSubscription: false,
            hasTheme: false,
            issue: 'no_subscription' as const,
          }),
      getCachedPublicMonthlyKitProducts(),
      getCachedPaintKitProducts(),
      showFullCatalog ? getCachedFeaturedProducts() : Promise.resolve([]),
      showFullCatalog ? getCachedNewestProducts() : Promise.resolve([]),
    ]);

  const planKits =
    showFullCatalog && monthlyKitStore.products.length > 0
      ? monthlyKitStore.products
      : publicMonthlyKits;

  const [visiblePlanKits, visiblePaintKits, visibleFeatured, visibleNewest] =
    await Promise.all([
      filterStoreProductsForVitrine(admin, planKits),
      filterStoreProductsForVitrine(
        admin,
        showFullCatalog ? paintKitProducts : filterPublicStoreProducts(paintKitProducts)
      ),
      filterStoreProductsForVitrine(admin, featured),
      filterStoreProductsForVitrine(admin, newest),
    ]);

  const [
    subscriberPlanKits,
    subscriberPaintKits,
    subscriberFeatured,
    subscriberNewest,
  ] = await Promise.all([
    enrichStoreProductsForSubscriber(supabase, user?.id, visiblePlanKits),
    enrichStoreProductsForSubscriber(supabase, user?.id, visiblePaintKits),
    enrichStoreProductsForSubscriber(supabase, user?.id, visibleFeatured),
    enrichStoreProductsForSubscriber(supabase, user?.id, visibleNewest),
  ]);

  const visibleCategories = showFullCatalog
    ? categories
    : filterPublicStoreCategories(categories);
  const showSubscriberMonthlyKits =
    showFullCatalog && visiblePlanKits.length > 0 && monthlyKitStore.products.length > 0;

  return (
    <>
      {banners.length > 0 ? (
        <ShopHeroSlider banners={banners} />
      ) : (
        <ShopHero />
      )}
      <ShopCategorySlider categories={visibleCategories} />

      <div id="produtos" className="scroll-mt-28">
        {visiblePlanKits.length > 0 ? (
          <ShopSection
            titleId="loja-kits-title"
            eyebrow={showSubscriberMonthlyKits ? 'Exclusivo assinantes' : 'Planos'}
            title={showSubscriberMonthlyKits ? 'Kit do mês' : 'Kits avulsos'}
            support={
              showSubscriberMonthlyKits
                ? `${planSupportCopy.heroSubtitle} Compre cópias extras de qualquer plano — enviadas junto com a próxima caixa, sem frete.`
                : 'Escolha qualquer plano e receba o kit do tema do mês em casa. Compra avulsa com frete calculado no checkout.'
            }
          >
            <ShopProductList products={subscriberPlanKits} />
            {!showSubscriberMonthlyKits ? (
              <p className="home-v2-reveal mt-8 text-sm text-mesa-ash">
                Prefere receber todo mês?{' '}
                <Link href="/#planos" className={inlineLinkClass}>
                  Assine um plano
                </Link>{' '}
                e economize no frete recorrente.
              </p>
            ) : null}
          </ShopSection>
        ) : showFullCatalog ? (
          <div className="px-4 py-14 sm:px-6">
            <MonthlyKitEmptyState issue={monthlyKitStore.issue} />
          </div>
        ) : null}

        <ShopProductGrid
          eyebrow="Acessórios"
          title="Kits de pintura"
          products={subscriberPaintKits}
          viewAllHref={STORE_ROUTES.category('kits-pintura')}
        />

        {showFullCatalog ? (
          <>
            <ShopProductSlider
              eyebrow="Destaque"
              title="Produtos em destaque"
              products={subscriberFeatured}
            />

            <ShopIntermediateBanner />

            <ShopProductGrid
              eyebrow="Novidades"
              title="Recém adicionados"
              products={subscriberNewest}
              variant="compact"
            />
          </>
        ) : null}
      </div>

      <ShopSubscriptionBanner />
    </>
  );
}
