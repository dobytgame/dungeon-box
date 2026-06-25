'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import AdminSearchForm from '@/components/admin/AdminSearchForm';
import AdminSection from '@/components/admin/AdminSection';
import AdminSheet from '@/components/admin/AdminSheet';
import AdminTable from '@/components/admin/AdminTable';
import {
  cancelFinancialExpenseAction,
  saveFinancialExpenseAction,
} from '@/lib/admin/actions';
import type {
  AdminFinancialCategoryRow,
  AdminFinancialExpenseRow,
} from '@/lib/admin/types';
import { formatDate, formatMoney } from '@/lib/dashboard/format';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'paid', label: 'Pago' },
  { value: 'pending', label: 'Pendente' },
  { value: 'cancelled', label: 'Cancelado' },
];

const STATUS_LABEL: Record<AdminFinancialExpenseRow['status'], string> = {
  paid: 'Pago',
  pending: 'Pendente',
  cancelled: 'Cancelado',
};

interface Props {
  expenses: AdminFinancialExpenseRow[];
  categories: AdminFinancialCategoryRow[];
  status?: string;
  categoryId?: string;
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export default function AdminFinanceExpensesClient({
  expenses,
  categories,
  status,
  categoryId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<AdminFinancialExpenseRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setError(null);
    setSheetOpen(true);
  }

  function openEdit(row: AdminFinancialExpenseRow) {
    setEditing(row);
    setError(null);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditing(null);
    setError(null);
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await saveFinancialExpenseAction(editing?.id ?? null, formData);
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      closeSheet();
      router.refresh();
    });
  }

  function handleCancel(id: string) {
    if (!confirm('Cancelar este lançamento?')) return;
    startTransition(async () => {
      await cancelFinancialExpenseAction(id);
      router.refresh();
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminSearchForm defaultValue="" placeholder="Busca em breve" name="q">
          <div>
            <label htmlFor="expense-status" className="sr-only">
              Status
            </label>
            <select
              id="expense-status"
              name="status"
              defaultValue={status ?? ''}
              className="rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="expense-category" className="sr-only">
              Categoria
            </label>
            <select
              id="expense-category"
              name="category"
              defaultValue={categoryId ?? ''}
              className="rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white"
            >
              <option value="">Todas categorias</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </AdminSearchForm>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-sm bg-console px-4 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950"
        >
          Novo gasto
        </button>
      </div>

      <AdminSection title="Lançamentos de gastos">
        <AdminTable
          rows={expenses}
          columns={[
            {
              key: 'date',
              header: 'Data',
              cell: (row) => (
                <span className="font-mono text-[11px] text-zinc-400">
                  {formatDate(row.expense_date)}
                </span>
              ),
            },
            {
              key: 'category',
              header: 'Categoria',
              cell: (row) => (
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  {row.categoryName}
                </span>
              ),
            },
            {
              key: 'description',
              header: 'Descrição',
              cell: (row) => (
                <div>
                  <p className="text-sm text-zinc-300">{row.description}</p>
                  {row.vendor ? (
                    <p className="font-mono text-[10px] text-zinc-600">{row.vendor}</p>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'amount',
              header: 'Valor',
              cell: (row) => (
                <span className="font-mono tabular-nums text-red-300">
                  −{formatMoney(row.amount_cents)}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              cell: (row) => (
                <span
                  className={`font-mono text-[10px] uppercase tracking-widest ${
                    row.status === 'paid'
                      ? 'text-console'
                      : row.status === 'pending'
                        ? 'text-amber-300'
                        : 'text-zinc-600'
                  }`}
                >
                  {STATUS_LABEL[row.status]}
                </span>
              ),
            },
            {
              key: 'actions',
              header: '',
              cell: (row) =>
                row.status !== 'cancelled' ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => openEdit(row)}
                      className="font-mono text-[10px] uppercase tracking-widest text-console hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleCancel(row.id)}
                      className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 hover:text-red-300"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : null,
            },
          ]}
          emptyMessage="Nenhum gasto registrado."
        />
      </AdminSection>

      <p className="font-mono text-[11px] text-zinc-600">
        {expenses.length} registro(s).{' '}
        <Link href="/admin/financeiro/gastos" className="text-console hover:underline">
          Limpar filtros
        </Link>
      </p>

      <AdminSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={editing ? 'Editar gasto' : 'Novo gasto'}
        subtitle="Registre despesas operacionais da Dungeonbox"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit(new FormData(event.currentTarget));
          }}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {error ? (
              <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            <div>
              <label htmlFor="category_id" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                Categoria
              </label>
              <select
                id="category_id"
                name="category_id"
                required
                defaultValue={editing?.categoryId ?? ''}
                className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white"
              >
                <option value="" disabled>
                  Selecione…
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="description" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                Descrição
              </label>
              <input
                id="description"
                name="description"
                required
                defaultValue={editing?.description ?? ''}
                placeholder="Ex.: Resina para miniaturas — lote março"
                className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="amount" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Valor (R$)
                </label>
                <input
                  id="amount"
                  name="amount"
                  required
                  inputMode="decimal"
                  defaultValue={editing ? centsToInput(editing.amount_cents) : ''}
                  placeholder="0,00"
                  className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 font-mono text-sm text-white"
                />
              </div>
              <div>
                <label htmlFor="vendor" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Fornecedor
                </label>
                <input
                  id="vendor"
                  name="vendor"
                  defaultValue={editing?.vendor ?? ''}
                  placeholder="Opcional"
                  className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="expense_date" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Data do gasto
                </label>
                <input
                  id="expense_date"
                  name="expense_date"
                  type="date"
                  required
                  defaultValue={editing?.expense_date ?? today}
                  className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white"
                />
              </div>
              <div>
                <label htmlFor="paid_at" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Data do pagamento
                </label>
                <input
                  id="paid_at"
                  name="paid_at"
                  type="date"
                  defaultValue={editing?.paid_at ?? ''}
                  className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="status" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={editing?.status ?? 'paid'}
                className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white"
              >
                <option value="paid">Pago</option>
                <option value="pending">Pendente</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>

            <div>
              <label htmlFor="notes" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                Observações
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={editing?.notes ?? ''}
                className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white"
              />
            </div>
          </div>

          <footer className="flex shrink-0 gap-3 border-t border-zinc-800 px-5 py-4">
            <button
              type="button"
              onClick={closeSheet}
              className="flex-1 rounded-sm border border-zinc-700 px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-zinc-400"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-sm bg-console px-4 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950 disabled:opacity-50"
            >
              {pending ? 'Salvando…' : 'Salvar'}
            </button>
          </footer>
        </form>
      </AdminSheet>
    </div>
  );
}
