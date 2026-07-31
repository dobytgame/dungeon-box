import Link from 'next/link';
import AdminListPagination from '@/components/admin/AdminListPagination';
import AdminListSortFields from '@/components/admin/AdminListSortFields';
import AdminSearchForm from '@/components/admin/AdminSearchForm';
import AdminTable from '@/components/admin/AdminTable';
import { requireAdmin } from '@/lib/admin/auth';
import { parseAdminListPagination } from '@/lib/admin/list-pagination';
import {
  listAdminWhatsAppLeads,
  whatsAppLeadSourceLabel,
  type WhatsAppLeadSortField,
} from '@/lib/admin/whatsapp-leads';
import { formatDateTime } from '@/lib/dashboard/format';
import { COMPANY } from '@/lib/legal/constants';

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

const SORT_OPTIONS: { value: WhatsAppLeadSortField; label: string }[] = [
  { value: 'created_at', label: 'Data de cadastro' },
  { value: 'name', label: 'Nome' },
  { value: 'email', label: 'E-mail' },
];

function parseFilters(searchParams: Record<string, string | undefined>) {
  const pagination = parseAdminListPagination(searchParams, {
    defaultSort: 'created_at',
    defaultOrder: 'desc',
    allowedSorts: ['created_at', 'name', 'email'] satisfies WhatsAppLeadSortField[],
  });

  return {
    q: searchParams.q?.trim() || undefined,
    page: pagination.page,
    pageSize: pagination.pageSize,
    sort: pagination.sort as WhatsAppLeadSortField,
    order: pagination.order,
  };
}

export default async function AdminMarketingLeadsPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const params = await searchParams;
  const filters = parseFilters(params);
  const result = await listAdminWhatsAppLeads(admin, filters);

  return (
    <div className="space-y-6">
      <AdminSearchForm
        defaultValue={filters.q ?? ''}
        placeholder="Nome, e-mail ou WhatsApp"
      >
        <AdminListSortFields
          sort={filters.sort}
          order={filters.order}
          pageSize={filters.pageSize}
          sortOptions={SORT_OPTIONS}
          sortId="leads-sort"
          orderId="leads-order"
          pageSizeId="leads-page-size"
        />
      </AdminSearchForm>

      <AdminTable
        rows={result.items}
        emptyMessage="Nenhum lead encontrado."
        columns={[
          {
            key: 'name',
            header: 'Lead',
            cell: (row) => (
              <div>
                <p className="text-zinc-100">{row.name}</p>
                <p className="text-xs text-zinc-500">{row.email}</p>
              </div>
            ),
          },
          {
            key: 'phone',
            header: 'WhatsApp',
            cell: (row) => (
              <a
                href={`https://wa.me/${row.phone_e164}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-console hover:underline"
              >
                {row.phone_display}
              </a>
            ),
          },
          {
            key: 'source',
            header: 'Origem',
            cell: (row) => (
              <div>
                <p>{whatsAppLeadSourceLabel(row.source)}</p>
                {row.page_path ? (
                  <p className="text-xs text-zinc-500">{row.page_path}</p>
                ) : null}
              </div>
            ),
          },
          {
            key: 'utm',
            header: 'Campanha',
            cell: (row) =>
              row.utm_source || row.utm_campaign ? (
                <div className="text-xs text-zinc-400">
                  {row.utm_source ? <p>source: {row.utm_source}</p> : null}
                  {row.utm_medium ? <p>medium: {row.utm_medium}</p> : null}
                  {row.utm_campaign ? <p>campaign: {row.utm_campaign}</p> : null}
                </div>
              ) : (
                '—'
              ),
          },
          {
            key: 'created',
            header: 'Recebido em',
            cell: (row) => formatDateTime(row.created_at),
          },
        ]}
      />

      <AdminListPagination
        basePath="/admin/marketing/leads"
        result={result}
        searchParams={params}
        noun="lead"
      />

      <p className="text-xs text-zinc-500">
        Leads capturados pelo widget de WhatsApp. Conversas abrem para{' '}
        {COMPANY.whatsappDisplay}.{' '}
        {filters.q ? (
          <Link
            href="/admin/marketing/leads"
            className="text-console hover:underline"
          >
            Limpar filtros
          </Link>
        ) : null}
      </p>
    </div>
  );
}
