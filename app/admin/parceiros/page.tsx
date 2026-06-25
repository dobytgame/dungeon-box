import Link from 'next/link';
import AdminSearchForm from '@/components/admin/AdminSearchForm';
import AdminTable from '@/components/admin/AdminTable';
import PartnerBadge from '@/components/admin/PartnerBadge';
import PartnerRemoveButton from '@/components/admin/PartnerRemoveButton';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/admin/auth';
import { listAdminPartnerSubscriptions } from '@/lib/admin/queries';
import type { SubscriptionStatus } from '@/lib/dashboard/types';
import { formatDate } from '@/lib/dashboard/format';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminPartnersPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const { q } = await searchParams;
  const partners = await listAdminPartnerSubscriptions(admin, { q, limit: 200 });

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <p className="font-display text-xs uppercase tracking-[0.35em] text-violet-300/80">
          Programa parceiro
        </p>
        <h2 className="mt-2 font-display text-2xl uppercase tracking-wide text-white md:text-3xl">
          Parceiros
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-400">
          Assinaturas isentas de cobrança. Entram na produção normalmente, sem
          passar pelo Asaas.
        </p>
      </div>

      <AdminSearchForm
        defaultValue={q ?? ''}
        placeholder="Nome, e-mail ou plano"
      />

      <AdminTable
        rows={partners}
        getRowHref={(row) => `/admin/assinaturas/${row.id}`}
        columns={[
          {
            key: 'customer',
            header: 'Cliente',
            cell: (row) => (
              <div>
                <p>{row.customerName ?? '—'}</p>
                <p className="text-xs text-stone-500">{row.customerEmail}</p>
              </div>
            ),
          },
          {
            key: 'profile',
            header: 'Perfil',
            cell: (row) => (
              <Link
                href={`/admin/clientes/${row.user_id}`}
                className="text-xs text-console hover:underline"
              >
                Ver cliente
              </Link>
            ),
          },
          {
            key: 'plan',
            header: 'Plano',
            cell: (row) => (
              <div className="flex flex-wrap items-center gap-2">
                <span>{row.planName ?? '—'}</span>
                <PartnerBadge compact />
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            cell: (row) => (
              <StatusBadge
                kind="subscription"
                status={row.status as SubscriptionStatus}
              />
            ),
          },
          {
            key: 'cycle',
            header: 'Ciclo',
            cell: (row) =>
              row.current_cycle != null ? `#${row.current_cycle}` : '—',
          },
          {
            key: 'started',
            header: 'Desde',
            cell: (row) => formatDate(row.started_at),
          },
          {
            key: 'actions',
            header: 'Ações',
            cell: (row) => <PartnerRemoveButton subscriptionId={row.id} />,
          },
        ]}
        emptyMessage="Nenhum parceiro cadastrado."
      />

      <p className="text-xs text-stone-500">
        {partners.length} parceiro(s).{' '}
        <Link href="/admin/parceiros" className="text-console hover:underline">
          Limpar filtros
        </Link>
      </p>
    </div>
  );
}
