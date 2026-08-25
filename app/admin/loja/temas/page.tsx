import Link from 'next/link';
import AdminTable from '@/components/admin/AdminTable';
import { requireAdmin } from '@/lib/admin/auth';
import { listAdminStoreKitThemes } from '@/lib/admin/store-kit-themes';
import { formatStoreKitThemeLabel } from '@/lib/store/kit-themes';

export default async function AdminStoreKitThemesPage() {
  const { admin } = await requireAdmin();
  const themes = await listAdminStoreKitThemes(admin);

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
            Temas que o cliente escolhe ao comprar um kit do mês na loja. O
            tema escolhido aparece no pedido e no kanban de produção.
          </p>
        </div>
        <Link
          href="/admin/loja/temas/novo"
          className="inline-flex rounded-sm bg-console px-4 py-2 font-display text-xs uppercase tracking-widest text-stone-950"
        >
          Novo tema
        </Link>
      </div>

      <AdminTable
        rows={themes}
        getRowHref={(row) => `/admin/loja/temas/${row.id}`}
        columns={[
          {
            key: 'kit',
            header: 'Kit',
            cell: (row) => formatStoreKitThemeLabel(row),
          },
          {
            key: 'slug',
            header: 'Slug',
            cell: (row) => row.slug,
          },
          {
            key: 'order',
            header: 'Ordem',
            cell: (row) => String(row.sortOrder),
          },
          {
            key: 'active',
            header: 'Status',
            cell: (row) => (row.isActive ? 'Ativo' : 'Inativo'),
          },
        ]}
        emptyMessage="Nenhum tema cadastrado."
      />
    </div>
  );
}
