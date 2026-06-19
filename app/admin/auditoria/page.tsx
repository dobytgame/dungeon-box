import AdminTable from '@/components/admin/AdminTable';
import { requireAdmin } from '@/lib/admin/auth';
import { listAdminAuditLog } from '@/lib/admin/queries';
import { formatDateTime } from '@/lib/dashboard/format';

export default async function AdminAuditPage() {
  const { admin } = await requireAdmin();
  const rows = await listAdminAuditLog(admin, 150);

  return (
    <AdminTable
      rows={rows}
      columns={[
        {
          key: 'when',
          header: 'Quando',
          cell: (row) => formatDateTime(row.created_at),
        },
        {
          key: 'actor',
          header: 'Admin',
          cell: (row) => (
            <div>
              <p>{row.actorName ?? '—'}</p>
              <p className="text-xs text-stone-500">{row.actorEmail}</p>
            </div>
          ),
        },
        {
          key: 'action',
          header: 'Ação',
          cell: (row) => row.action,
        },
        {
          key: 'entity',
          header: 'Entidade',
          cell: (row) => `${row.entity_type}${row.entity_id ? ` · ${row.entity_id.slice(0, 8)}…` : ''}`,
        },
        {
          key: 'ip',
          header: 'IP',
          cell: (row) => row.ip_address ?? '—',
        },
      ]}
      emptyMessage="Nenhuma ação registrada ainda."
    />
  );
}
