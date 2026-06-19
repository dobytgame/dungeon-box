import Link from 'next/link';
import AdminSearchForm from '@/components/admin/AdminSearchForm';
import AdminTable from '@/components/admin/AdminTable';
import { requireAdmin } from '@/lib/admin/auth';
import { listAdminThemes } from '@/lib/admin/queries';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminThemesPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const { q } = await searchParams;
  const themes = await listAdminThemes(admin, { q, limit: 100 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminSearchForm defaultValue={q ?? ''} placeholder="Nome ou slug" />
        <Link
          href="/admin/temas/novo"
          className="rounded-sm bg-console px-4 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950"
        >
          Novo tema
        </Link>
      </div>

      <AdminTable
        rows={themes.map((theme) => ({ ...theme, id: theme.id }))}
        getRowHref={(row) => `/admin/temas/${row.id}`}
        columns={[
          {
            key: 'period',
            header: 'Período',
            cell: (row) => `${String(row.month_number).padStart(2, '0')}/${row.year}`,
          },
          { key: 'name', header: 'Nome', cell: (row) => row.name },
          {
            key: 'slug',
            header: 'Slug',
            cell: (row) => row.slug,
          },
          {
            key: 'flags',
            header: 'Status',
            cell: (row) =>
              [
                row.is_active ? 'Ativo' : 'Inativo',
                row.is_revealed ? 'Revelado' : 'Oculto',
              ].join(' · '),
          },
        ]}
      />
    </div>
  );
}
