import Link from 'next/link';
import AdminTable from '@/components/admin/AdminTable';
import { requireAdmin } from '@/lib/admin/auth';
import { listAdminStoreBanners } from '@/lib/admin/store-banners';

export default async function AdminStoreBannersPage() {
  const { admin } = await requireAdmin();
  const banners = await listAdminStoreBanners(admin);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500">
          Slides do hero da home da loja (/loja). Ordem crescente.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/loja"
            className="inline-flex rounded-sm border border-white/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-stone-300"
          >
            Produtos
          </Link>
          <Link
            href="/admin/loja/banners/novo"
            className="inline-flex rounded-sm bg-console px-4 py-2 font-display text-xs uppercase tracking-widest text-stone-950"
          >
            Novo banner
          </Link>
        </div>
      </div>

      <AdminTable
        rows={banners}
        getRowHref={(row) => `/admin/loja/banners/${row.id}`}
        columns={[
          {
            key: 'title',
            header: 'Título',
            cell: (row) => (
              <div>
                <p>{row.title}</p>
                {row.subtitle ? (
                  <p className="text-xs text-stone-500">{row.subtitle}</p>
                ) : null}
              </div>
            ),
          },
          {
            key: 'cta',
            header: 'CTA',
            cell: (row) =>
              row.cta_label ? `${row.cta_label} → ${row.cta_href ?? ''}` : '—',
          },
          {
            key: 'order',
            header: 'Ordem',
            cell: (row) => String(row.sort_order),
          },
          {
            key: 'active',
            header: 'Status',
            cell: (row) => (row.is_active ? 'Ativo' : 'Inativo'),
          },
        ]}
      />
    </div>
  );
}
