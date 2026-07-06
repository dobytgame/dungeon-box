import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import CategoryFilters from '@/components/shop/CategoryFilters';
import ProductDescriptionContent from '@/components/shop/ProductDescriptionContent';
import ShopCategoryHero from '@/components/shop/ShopCategoryHero';
import ShopSubcategoryRow from '@/components/shop/ShopSubcategoryRow';
import StoreProductCard from '@/components/store/StoreProductCard';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  loadActiveProductsByCategory,
  loadActiveStoreSubcategories,
} from '@/lib/store/load-catalog';
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
  const { category, products, total } = await loadActiveProductsByCategory(
    admin,
    categoria,
    { sort, page }
  );

  if (!category) notFound();

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

  const hasHero = Boolean(category.bannerUrl || category.thumbUrl);

  return (
    <>
      {hasHero ? <ShopCategoryHero category={category} /> : null}

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
        <nav
          className="mb-8 flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-stone-500"
          aria-label="Breadcrumb"
        >
          <Link href={STORE_ROUTES.home} className="hover:text-ember">
            Loja
          </Link>
          {category.parentSlug ? (
            <>
              <span aria-hidden="true">/</span>
              <Link
                href={STORE_ROUTES.category(category.parentSlug)}
                className="hover:text-ember"
              >
                {category.parentName}
              </Link>
            </>
          ) : null}
          <span aria-hidden="true">/</span>
          <span className="text-stone-400">{category.name}</span>
        </nav>

        {!hasHero ? (
          <header className="mb-6 border-b border-white/[0.06] pb-8">
            <p className="font-display text-xs uppercase tracking-[0.25em] text-stone-500">
              {category.parentName ? 'Subcategoria' : 'Categoria'}
            </p>
            <h1 className="mt-2 font-display text-3xl uppercase tracking-wide text-white sm:text-4xl">
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

        <ShopSubcategoryRow
          parentCategory={parentCategory}
          subcategories={subcategories}
          activeSlug={category.slug}
        />

        <Suspense fallback={null}>
          <CategoryFilters
            categorySlug={categoria}
            total={total}
            currentPage={page}
          />
        </Suspense>

        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <StoreProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-500">
            Nenhum produto disponível nesta categoria no momento.
          </p>
        )}
      </div>
    </>
  );
}
