import AdminTable from '@/components/admin/AdminTable';
import { requireAdmin } from '@/lib/admin/auth';
import { listAdminPlans } from '@/lib/admin/queries';
import { formatMoney } from '@/lib/dashboard/format';

export default async function AdminPlansPage() {
  const { admin } = await requireAdmin();
  const plans = await listAdminPlans(admin);

  return (
    <div className="space-y-6">
      <AdminTable
        rows={plans}
        getRowHref={(row) => `/admin/planos/${row.id}`}
        columns={[
          {
            key: 'name',
            header: 'Plano',
            cell: (row) => (
              <div>
                <p>{row.name}</p>
                <p className="text-xs text-stone-500">{row.slug}</p>
              </div>
            ),
          },
          {
            key: 'price',
            header: 'Preço',
            cell: (row) => formatMoney(row.price_cents),
          },
          {
            key: 'pieces',
            header: 'Peças',
            cell: (row) => `${row.pieces_min}–${row.pieces_max}`,
          },
          {
            key: 'active',
            header: 'Checkout',
            cell: (row) => (row.is_active ? 'Ativo' : 'Inativo'),
          },
        ]}
      />
      <p className="text-xs text-stone-500">
        Copy de marketing (LP) continua em `lib/data.ts` até a Fase 3.
      </p>
    </div>
  );
}
