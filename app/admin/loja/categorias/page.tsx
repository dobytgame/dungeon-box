import Link from 'next/link';
import AdminTable from '@/components/admin/AdminTable';
import { requireAdmin } from '@/lib/admin/auth';
import { listAdminStoreCategories } from '@/lib/admin/store-categories';

export default async function AdminStoreCategoriesPage() {
  const { admin } = await requireAdmin();
  const categories = await listAdminStoreCategories(admin);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/loja"
            className="inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-console"
          >
            ← Voltar para produtos
          </Link>
          <p className="mt-3 text-sm text-stone-500">
            Categorias exibidas na vitrine da loja. Produtos podem ser agrupados
            por categoria na página do site.
          </p>
        </div>
        <Link
          href="/admin/loja/categorias/novo"
          className="inline-flex rounded-sm bg-console px-4 py-2 font-display text-xs uppercase tracking-widest text-stone-950"
        >
          Nova categoria
        </Link>
      </div>

      <AdminTable
        rows={categories}
        getRowHref={(row) => `/admin/loja/categorias/${row.id}`}
        columns={[
          {
            key: 'name',
            header: 'Categoria',
            cell: (row) => (
              <div>
                <p>{row.name}</p>
                <p className="text-xs text-stone-500">{row.slug}</p>
              </div>
            ),
          },
          {
            key: 'products',
            header: 'Produtos',
            cell: (row) => String(row.product_count),
          },
          {
            key: 'order',
            header: 'Ordem',
            cell: (row) => String(row.sort_order),
          },
          {
            key: 'active',
            header: 'Status',
            cell: (row) => (row.is_active ? 'Ativa' : 'Inativa'),
          },
        ]}
        emptyMessage="Nenhuma categoria cadastrada."
      />
    </div>
  );
}
