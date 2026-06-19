'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import AdminSearchForm from '@/components/admin/AdminSearchForm';
import AdminTable from '@/components/admin/AdminTable';
import { duplicatePromoCodeAction } from '@/lib/admin/actions';
import { formatPromoSummary } from '@/lib/checkout/promo-codes';
import type { AdminPromoCodeRow } from '@/lib/admin/types';
import { formatDate } from '@/lib/dashboard/format';

interface Props {
  promos: AdminPromoCodeRow[];
  q?: string;
  status?: string;
}

export default function AdminPromoCodesClient({ promos, q, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminSearchForm defaultValue={q ?? ''} placeholder="Código do cupom">
          <div>
            <label htmlFor="promo-status" className="sr-only">
              Status
            </label>
            <select
              id="promo-status"
              name="status"
              defaultValue={status ?? ''}
              className="rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white"
            >
              <option value="">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </AdminSearchForm>
        <Link
          href="/admin/cupons/novo"
          className="rounded-sm bg-console px-4 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950"
        >
          Novo cupom
        </Link>
      </div>

      <AdminTable
        rows={promos}
        getRowHref={(row) => `/admin/cupons/${row.id}`}
        columns={[
          {
            key: 'code',
            header: 'Código',
            cell: (row) => row.code,
          },
          {
            key: 'discount',
            header: 'Desconto',
            cell: (row) => formatPromoSummary(row),
          },
          {
            key: 'usage',
            header: 'Usos',
            cell: (row) =>
              row.max_redemptions != null
                ? `${row.times_redeemed}/${row.max_redemptions}`
                : String(row.times_redeemed),
          },
          {
            key: 'active',
            header: 'Ativo',
            cell: (row) => (row.active ? 'Sim' : 'Não'),
          },
          {
            key: 'expires',
            header: 'Expira',
            cell: (row) => formatDate(row.expires_at),
          },
          {
            key: 'duplicate',
            header: '',
            cell: (row) => (
              <button
                type="button"
                disabled={pending}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  startTransition(async () => {
                    const result = await duplicatePromoCodeAction(row.id);
                    if ('id' in result) {
                      router.push(`/admin/cupons/${result.id}`);
                      router.refresh();
                    }
                  });
                }}
                className="cursor-pointer text-xs uppercase tracking-widest text-console hover:underline"
              >
                Duplicar
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}
