import Link from 'next/link';
import AdminSearchForm from '@/components/admin/AdminSearchForm';
import AdminTable from '@/components/admin/AdminTable';
import ComboBadge from '@/components/admin/ComboBadge';
import PartnerBadge from '@/components/admin/PartnerBadge';
import ReferralAttributionBadge from '@/components/admin/ReferralAttributionBadge';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/admin/auth';
import { listAdminCustomers } from '@/lib/admin/queries';
import { formatDate } from '@/lib/dashboard/format';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminCustomersPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const { q } = await searchParams;
  const customers = await listAdminCustomers(admin, { q, limit: 100 });

  return (
    <div className="space-y-6">
      <AdminSearchForm
        defaultValue={q ?? ''}
        placeholder="Nome, e-mail ou CPF"
      />

      <AdminTable
        rows={customers}
        getRowHref={(row) => `/admin/clientes/${row.id}`}
        columns={[
          {
            key: 'name',
            header: 'Cliente',
            cell: (row) => (
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p>{row.full_name ?? row.display_name ?? '—'}</p>
                  {row.isPartner ? <PartnerBadge compact /> : null}
                  {row.comboTerms.map((term) => (
                    <ComboBadge key={term} term={term} compact />
                  ))}
                </div>
                <p className="text-xs text-stone-500">{row.email}</p>
              </div>
            ),
          },
          {
            key: 'phone',
            header: 'Telefone',
            cell: (row) => row.phone ?? '—',
          },
          {
            key: 'subs',
            header: 'Assinaturas ativas',
            cell: (row) => String(row.activeSubscriptions),
          },
          {
            key: 'status',
            header: 'Status',
            cell: (row) =>
              row.latestStatus ? (
                <StatusBadge kind="subscription" status={row.latestStatus} />
              ) : (
                '—'
              ),
          },
          {
            key: 'referral',
            header: 'Link parceiro',
            cell: (row) =>
              row.referralAttribution ? (
                <ReferralAttributionBadge
                  attribution={row.referralAttribution}
                  compact
                />
              ) : (
                '—'
              ),
          },
          {
            key: 'created',
            header: 'Cadastro',
            cell: (row) => formatDate(row.created_at),
          },
        ]}
      />

      <p className="text-xs text-stone-500">
        {customers.length} registro(s).{' '}
        <Link href="/admin/clientes" className="text-console hover:underline">
          Limpar filtros
        </Link>
      </p>
    </div>
  );
}
