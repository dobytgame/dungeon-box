'use client';

import AdminTable from '@/components/admin/AdminTable';
import AdminPlanChip from '@/components/admin/AdminPlanChip';
import StatusBadge from '@/components/dashboard/StatusBadge';
import type { AdminCycleRow } from '@/lib/admin/types';
import type { CycleStatus } from '@/lib/dashboard/types';
import { formatDateTime } from '@/lib/dashboard/format';

interface Props {
  rows: AdminCycleRow[];
  onOpenDetail: (row: AdminCycleRow) => void;
}

export default function ArchiveCyclesTable({ rows, onOpenDetail }: Props) {
  return (
    <AdminTable
      rows={rows}
      onRowClick={onOpenDetail}
      emptyMessage="Nenhum pedido nesta fila."
      columns={[
        {
          key: 'customer',
          header: 'Cliente',
          cell: (row) => (
            <div>
              <p>{row.customerName ?? '—'}</p>
              <p className="font-mono text-[11px] text-zinc-600">{row.customerEmail}</p>
            </div>
          ),
        },
        {
          key: 'cycle',
          header: 'Ciclo',
          cell: (row) => `#${row.cycle_number}`,
        },
        {
          key: 'plan',
          header: 'Plano',
          cell: (row) => (
            <AdminPlanChip slug={row.planSlug} name={row.planName} compact />
          ),
        },
        {
          key: 'theme',
          header: 'Tema',
          cell: (row) => row.themeName ?? '—',
        },
        {
          key: 'status',
          header: 'Status',
          cell: (row) => (
            <StatusBadge kind="cycle" status={row.status as CycleStatus} />
          ),
        },
        {
          key: 'destination',
          header: 'Destino',
          cell: (row) =>
            row.city && row.state ? `${row.city}/${row.state}` : '—',
        },
        {
          key: 'updated',
          header: 'Enviado em',
          cell: (row) => formatDateTime(row.shipped_at),
        },
      ]}
    />
  );
}
