import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import CategoryListingToolbar from '@/components/shop/CategoryListingToolbar';
import ProductDescriptionContent from '@/components/shop/ProductDescriptionContent';
import ShopCategoryHero from '@/components/shop/ShopCategoryHero';
import ShopProductGrid from '@/components/shop/ShopProductGrid';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  isPublicStoreCategorySlug,
  isStorePublic,
} from '@/lib/store/access';
import {
  loadActiveProductsByCategory,
  loadActiveStoreSubcategories,
} from '@/lib/store/load-catalog';
import { enrichStoreProductsForSubscriber } from '@/lib/store/subscriber-discount';
import { parseStorePage, parseStoreSort } from '@/lib/store/sort';
import { STORE_ROUTES } from '@/lib/store/routes';

interface Props {
  params: Promise<{ categoria: string }>;
  searchParams: Promise<{ ordenar?: string; pagina?: string }>;
}

export default async function LojaCategoryPage({ params, searchParams }: Props) {
  const { categoria } = await params;
  const { ordenar, pagina } = await searchParams;
  const sort = parseStoreSort(ordenar);
  const page = parseStorePage(pagina);

  const admin = createAdminClient();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { category, products: rawProducts, total } = await loadActiveProductsByCategory(
    admin,
    categoria,
    { sort, page }
  );

  if (!category) notFound();

  if (!isStorePublic() && !isPublicStoreCategorySlug(categoria)) {
    notFound();
  }

  const products = await enrichStoreProductsForSubscriber(
    supabase,
    user?.id,
    rawProducts
  );

  const subcategories = category.parentId
    ? await loadActiveStoreSubcategories(admin, category.parentId)
    : await loadActiveStoreSubcategories(admin, category.id);

  const parentCategory =
    category.parentId && category.parentSlug && category.parentName
      ? {
          id: category.parentId,
          slug: category.parentSlug,
          name: category.parentName,
          description: null,
          bannerUrl: null,
          thumbUrl: null,
          parentId: null,
          parentSlug: null,
          parentName: null,
        }
      : category;

  const breadcrumb = [
    { href: STORE_ROUTES.home, label: 'Loja' },
    ...(category.parentSlug && category.parentName
      ? [{ href: STORE_ROUTES.category(category.parentSlug), label: category.parentName }]
      : []),
    { label: category.name },
  ];

  const hasHero = Boolean(category.bannerUrl || category.thumbUrl);

  return (
    <>
      {hasHero ? <ShopCategoryHero category={category} /> : null}

      <div className="mx-auto max-w-[75rem] px-4 pb-16 pt-6 sm:px-6 sm:pt-8 md:pb-24">
        {!hasHero ? (
          <header className="mb-6 border-b border-white/10 pb-8 pt-6">
            <p className="home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade">
              {category.parentName ? 'Subcategoria' : 'Categoria'}
            </p>
            <h1
              data-reveal="mask"
              className="home-v2-reveal home-v2-display mt-3 text-[clamp(2.5rem,8vw,4.5rem)] leading-[0.9] text-mesa-parchment"
            >
              {category.name}
            </h1>
            {category.description ? (
              <ProductDescriptionContent
                html={category.description}
                className="mt-4"
              />
            ) : null}
          </header>
        ) : null}

        <Suspense fallback={null}>
          <CategoryListingToolbar
            parentCategory={parentCategory}
            subcategories={subcategories}
            activeSlug={category.slug}
            breadcrumb={breadcrumb}
            total={total}
            currentPage={page}
          />
        </Suspense>

        {products.length > 0 ? (
          <ShopProductGrid products={products} variant="compact" embedded />
        ) : (
          <div className="home-v2-grid flex min-h-56 items-center justify-center rounded-2xl border border-white/10 bg-mesa-stone p-8 text-center">
            <p className="max-w-sm text-sm leading-relaxed text-mesa-ash">
              Nenhum produto disponível nesta categoria no momento. Novas peças entram na loja todo
              mês.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
