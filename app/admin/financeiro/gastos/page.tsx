import Link from 'next/link';
import AdminFinanceExpensesClient from '@/components/admin/AdminFinanceExpensesClient';
import { requireAdmin } from '@/lib/admin/auth';
import { listFinancialCategories, listFinancialExpenses } from '@/lib/admin/finance';

interface Props {
  searchParams: Promise<{ status?: string; category?: string }>;
}

export default async function AdminFinanceExpensesPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const { status, category } = await searchParams;

  const [expenses, categories] = await Promise.all([
    listFinancialExpenses(admin, {
      status: status || undefined,
      categoryId: category || undefined,
      limit: 300,
    }),
    listFinancialCategories(admin),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Financeiro
          </p>
          <h1 className="mt-1 text-xl font-medium text-zinc-100">Gastos</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Matéria-prima, envios, anúncios, parcerias, taxas e demais despesas.
          </p>
        </div>
        <Link
          href="/admin/financeiro"
          className="font-mono text-[10px] uppercase tracking-widest text-console hover:underline"
        >
          ← Voltar ao fluxo de caixa
        </Link>
      </div>

      <AdminFinanceExpensesClient
        expenses={expenses}
        categories={categories}
        status={status}
        categoryId={category}
      />
    </div>
  );
}
