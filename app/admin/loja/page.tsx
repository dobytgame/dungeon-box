import Link from 'next/link';
import AdminTable from '@/components/admin/AdminTable';
import { requireAdmin } from '@/lib/admin/auth';
import { listAdminStoreCategories } from '@/lib/admin/store-categories';
import { listAdminStoreProducts } from '@/lib/admin/store-products';
import { formatMoney } from '@/lib/dashboard/format';

const PRODUCT_TYPE_LABEL = {
  'paint-kit': 'Kit de pintura',
  'monthly-kit': 'Kit avulso',
} as const;

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
          Kits de pintura e kits avulsos por plano. Configure imagens, galeria e
          conteúdo HTML da página de cada produto.
        </p>
        <div className="flex flex-wrap gap-2">
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
            cell: (row) => PRODUCT_TYPE_LABEL[row.category],
          },
          {
            key: 'price',
            header: 'Preço ref.',
            cell: (row) => formatMoney(row.price_cents),
          },
          {
            key: 'media',
            header: 'Mídia',
            cell: (row) =>
              row.image_url || row.gallery_urls.length > 0 || row.page_content_html
                ? 'Sim'
                : '—',
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
