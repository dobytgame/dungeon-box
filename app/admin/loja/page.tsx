import Link from 'next/link';
import AdminTable from '@/components/admin/AdminTable';
import { requireAdmin } from '@/lib/admin/auth';
import { listAdminStoreCategories } from '@/lib/admin/store-categories';
import { listAdminStoreProducts } from '@/lib/admin/store-products';
import { formatMoney } from '@/lib/dashboard/format';
import { STORE_PRODUCT_CATEGORY_LABELS } from '@/lib/store/catalog';
import { storeProductThumbClassName } from '@/lib/store/product-media';

function productThumbUrl(imageUrl: string | null, galleryUrls: string[]) {
  return imageUrl ?? galleryUrls[0] ?? null;
}

export default async function AdminStorePage() {
  const { admin } = await requireAdmin();
  const [products, categories] = await Promise.all([
    listAdminStoreProducts(admin),
    listAdminStoreCategories(admin),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500">
          Produtos da vitrine: itens avulsos, kits de pintura e kits do mês.
          Configure imagens, galeria e conteúdo HTML de cada produto.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/loja/banners"
            className="inline-flex rounded-sm border border-white/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-stone-300"
          >
            Banners
          </Link>
          <Link
            href="/admin/loja/categorias"
            className="inline-flex rounded-sm border border-white/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-stone-300"
          >
            Categorias
          </Link>
          <Link
            href="/admin/loja/novo"
            className="inline-flex rounded-sm bg-console px-4 py-2 font-display text-xs uppercase tracking-widest text-stone-950"
          >
            Novo produto
          </Link>
        </div>
      </div>

      <p className="text-xs text-stone-600">
        {categories.length} categoria(s) · {products.length} produto(s)
      </p>

      <AdminTable
        rows={products}
        getRowHref={(row) => `/admin/loja/${row.id}`}
        columns={[
          {
            key: 'thumb',
            header: '',
            className: 'w-16',
            cell: (row) => {
              const thumbUrl = productThumbUrl(row.image_url, row.gallery_urls);
              return thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbUrl}
                  alt=""
                  width={56}
                  height={56}
                  className={`${storeProductThumbClassName} h-14 w-14 rounded-sm border border-zinc-800/80 bg-zinc-900/60`}
                />
              ) : (
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-sm border border-dashed border-zinc-800/80 bg-zinc-900/40 text-[10px] uppercase tracking-widest text-zinc-600"
                  aria-hidden="true"
                >
                  —
                </div>
              );
            },
          },
          {
            key: 'name',
            header: 'Produto',
            cell: (row) => (
              <div>
                <p>{row.name}</p>
                <p className="text-xs text-stone-500">{row.slug}</p>
              </div>
            ),
          },
          {
            key: 'store_category',
            header: 'Categoria',
            cell: (row) => row.store_category_name ?? '—',
          },
          {
            key: 'type',
            header: 'Tipo',
            cell: (row) => STORE_PRODUCT_CATEGORY_LABELS[row.category],
          },
          {
            key: 'price',
            header: 'Preço ref.',
            cell: (row) => formatMoney(row.price_cents),
          },
          {
            key: 'content',
            header: 'Página',
            cell: (row) => (row.page_content_html ? 'HTML' : '—'),
          },
          {
            key: 'active',
            header: 'Loja',
            cell: (row) => (row.is_active ? 'Ativo' : 'Inativo'),
          },
        ]}
      />
    </div>
  );
}
