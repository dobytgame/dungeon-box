'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import StatusBadge from '@/components/dashboard/StatusBadge';
import type { AdminSaleRow, AdminSaleTableGroup, AdminSaleType } from '@/lib/admin/sales-types';
import { groupAdminSalesRows } from '@/lib/admin/sales-grouping';
import type { PaymentStatus } from '@/lib/dashboard/types';
import { formatDate, formatMoney } from '@/lib/dashboard/format';

const TYPE_BADGE: Record<AdminSaleType, string> = {
  assinatura: 'text-console',
  loja_avulsa: 'text-violet-300',
  loja_bundled: 'text-amber-200',
  outro: 'text-zinc-400',
};

interface Props {
  sales: AdminSaleRow[];
  emptyMessage?: string;
}

function rowHref(row: AdminSaleRow): string {
  return row.subscriptionId
    ? `/admin/assinaturas/${row.subscriptionId}`
    : `/admin/clientes/${row.userId}`;
}

function SaleAmount({ row, showComboTotal }: { row: AdminSaleRow; showComboTotal?: boolean }) {
  const displayCents =
    showComboTotal || row.countsInRevenue ? row.effectiveAmountCents : row.amount_cents;

  return (
    <div>
      <span className="font-mono tabular-nums text-zinc-100">
        {formatMoney(displayCents)}
      </span>
      {showComboTotal && row.installmentCount != null && row.installmentCount > 1 ? (
        <p className="text-xs text-stone-500">
          Total · {row.installmentCount}x no cartão
        </p>
      ) : null}
      {!showComboTotal && row.isComboInstallmentSlice ? (
        <p className="text-xs text-stone-500">Não soma na receita</p>
      ) : null}
    </div>
  );
}

export default function AdminSalesTable({
  sales,
  emptyMessage = 'Nenhuma venda encontrada para os filtros selecionados.',
}: Props) {
  const groups = useMemo(() => groupAdminSalesRows(sales), [sales]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (groups.length === 0) {
    return (
      <p className="admin-panel rounded px-4 py-10 text-center font-mono text-xs text-zinc-600">
        {emptyMessage}
      </p>
    );
  }

  function toggleGroup(groupId: string) {
    setExpanded((current) => ({ ...current, [groupId]: !current[groupId] }));
  }

  return (
    <div className="admin-panel overflow-x-auto rounded">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800/90 bg-zinc-900/50">
            {['Tipo', 'Cliente', 'Descrição', 'Valor', 'Status', 'Método', 'Data'].map(
              (header) => (
                <th
                  key={header}
                  scope="col"
                  className="px-4 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500"
                >
                  {header}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {groups.map((group, groupIndex) => {
            const row = group.main;
            const hasInstallments = group.installments.length > 0;
            const isOpen = expanded[group.id] === true;
            const href = rowHref(row);
            const stripe = groupIndex % 2 === 1 ? 'bg-zinc-900/20' : '';

            return (
              <GroupBlock
                key={group.id}
                group={group}
                stripe={stripe}
                href={href}
                hasInstallments={hasInstallments}
                isOpen={isOpen}
                onToggle={() => toggleGroup(group.id)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GroupBlock({
  group,
  stripe,
  href,
  hasInstallments,
  isOpen,
  onToggle,
}: {
  group: AdminSaleTableGroup;
  stripe: string;
  href: string;
  hasInstallments: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const row = group.main;
  const rowClass = `transition hover:bg-console/[0.04] ${stripe}`;

  return (
    <>
      <tr className={rowClass}>
        <td className="px-4 py-2.5 text-zinc-300">
          <span
            className={`font-mono text-[11px] uppercase tracking-widest ${TYPE_BADGE[row.saleType]}`}
          >
            {row.saleTypeLabel}
          </span>
        </td>
        <td className="px-4 py-2.5 text-zinc-300">
          <Link href={href} className="block hover:text-console">
            <p>{row.customerName ?? '—'}</p>
            <p className="font-mono text-[11px] text-zinc-600">{row.customerEmail}</p>
          </Link>
        </td>
        <td className="px-4 py-2.5 text-zinc-300">
          <div className="flex items-start gap-2">
            {hasInstallments ? (
              <button
                type="button"
                onClick={onToggle}
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border border-white/10 font-mono text-[10px] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
                aria-expanded={isOpen}
                aria-label={
                  isOpen
                    ? 'Ocultar parcelas do combo'
                    : `Mostrar ${group.installments.length} parcelas do combo`
                }
              >
                {isOpen ? '−' : '+'}
              </button>
            ) : null}
            <div>
              <p className="text-sm text-zinc-300">{row.description}</p>
              {row.comboLabel ? (
                <p className="font-mono text-[10px] text-amber-200/80">{row.comboLabel}</p>
              ) : null}
              {hasInstallments ? (
                <p className="font-mono text-[10px] text-zinc-600">
                  {group.installments.length} parcela(s) · valor total na receita
                </p>
              ) : null}
              {row.planName && row.saleType !== 'assinatura' ? (
                <p className="font-mono text-[10px] text-zinc-600">
                  Assinatura: {row.planName}
                </p>
              ) : null}
            </div>
          </div>
        </td>
        <td className="px-4 py-2.5 text-zinc-300">
          <SaleAmount row={row} showComboTotal={hasInstallments} />
        </td>
        <td className="px-4 py-2.5 text-zinc-300">
          <StatusBadge kind="payment" status={row.status as PaymentStatus} />
        </td>
        <td className="px-4 py-2.5 text-zinc-300">
          <span className="font-mono text-[11px] uppercase text-zinc-500">
            {row.payment_method ?? '—'}
          </span>
        </td>
        <td className="px-4 py-2.5 text-zinc-300">
          <span className="font-mono text-[11px] text-zinc-400">
            {formatDate(row.paid_at ?? row.created_at)}
          </span>
        </td>
      </tr>

      {hasInstallments && isOpen
        ? group.installments.map((installment, index) => (
            <tr key={installment.id} className={`${rowClass} bg-zinc-950/50`}>
              <td className="px-4 py-2 pl-10 text-zinc-500">
                <span className="font-mono text-[10px] uppercase tracking-widest">
                  Parcela {index + 1}
                </span>
              </td>
              <td className="px-4 py-2.5" />
              <td className="px-4 py-2.5 text-sm text-zinc-500">
                Cobrança Asaas
                {installment.asaasPaymentId ? (
                  <span className="ml-1 font-mono text-[10px] text-zinc-600">
                    {installment.asaasPaymentId}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-2.5 text-zinc-400">
                <SaleAmount row={installment} />
              </td>
              <td className="px-4 py-2.5 text-zinc-300">
                <StatusBadge
                  kind="payment"
                  status={installment.status as PaymentStatus}
                />
              </td>
              <td className="px-4 py-2.5 text-zinc-500">
                <span className="font-mono text-[11px] uppercase">
                  {installment.payment_method ?? '—'}
                </span>
              </td>
              <td className="px-4 py-2.5 text-zinc-500">
                <span className="font-mono text-[11px]">
                  {formatDate(installment.paid_at ?? installment.created_at)}
                </span>
              </td>
            </tr>
          ))
        : null}
    </>
  );
}
