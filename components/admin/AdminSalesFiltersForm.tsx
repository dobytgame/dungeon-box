import type { AdminSaleType } from '@/lib/admin/sales-types';
import type { DailySalesPeriod } from '@/lib/admin/daily-sales';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'pending', label: 'Pendente' },
  { value: 'rejected', label: 'Recusado' },
  { value: 'refunded', label: 'Reembolsado' },
] as const;

const TYPE_OPTIONS: { value: '' | AdminSaleType; label: string }[] = [
  { value: '', label: 'Todos os tipos' },
  { value: 'assinatura', label: 'Assinatura' },
  { value: 'loja_avulsa', label: 'Loja avulsa' },
  { value: 'loja_bundled', label: 'Loja + assinatura' },
  { value: 'outro', label: 'Outro' },
];

const PERIOD_OPTIONS: { value: DailySalesPeriod; label: string }[] = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'year', label: 'Ano inteiro' },
];

const MONTH_OPTIONS = [
  { value: '', label: 'Todos os meses' },
  ...Array.from({ length: 12 }, (_, index) => {
    const date = new Date(2026, index, 1);
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
    return { value: String(index + 1), label };
  }),
];

interface Props {
  values: {
    q?: string;
    status?: string;
    type?: string;
    salesYear: number;
    salesMonth?: number | null;
    salesPeriod: DailySalesPeriod;
  };
  availableYears: number[];
}

export default function AdminSalesFiltersForm({ values, availableYears }: Props) {
  return (
    <form
      className="admin-panel grid gap-3 rounded p-4 md:grid-cols-2 xl:grid-cols-4"
      method="get"
    >
      <div className="md:col-span-2 xl:col-span-4">
        <label htmlFor="sales-q" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          Buscar
        </label>
        <input
          id="sales-q"
          name="q"
          defaultValue={values.q ?? ''}
          placeholder="Cliente, e-mail, plano, descrição…"
          className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-console/40 focus:outline-none focus:ring-1 focus:ring-console/30"
        />
      </div>

      <div>
        <label htmlFor="sales-status" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          Status
        </label>
        <select
          id="sales-status"
          name="status"
          defaultValue={values.status ?? ''}
          className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="sales-type" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          Tipo
        </label>
        <select
          id="sales-type"
          name="type"
          defaultValue={values.type ?? ''}
          className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="sales-year" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          Ano
        </label>
        <select
          id="sales-year"
          name="salesYear"
          defaultValue={String(values.salesYear)}
          className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="sales-month" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          Mês
        </label>
        <select
          id="sales-month"
          name="salesMonth"
          defaultValue={values.salesMonth ? String(values.salesMonth) : ''}
          className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
        >
          {MONTH_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="sales-period" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          Período
        </label>
        <select
          id="sales-period"
          name="salesPeriod"
          defaultValue={values.salesPeriod}
          className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4">
        <button
          type="submit"
          className="cursor-pointer rounded border border-console/30 bg-console/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-console transition hover:bg-console/15"
        >
          Aplicar filtros
        </button>
        <a
          href="/admin/vendas"
          className="rounded border border-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
        >
          Limpar
        </a>
      </div>
    </form>
  );
}
