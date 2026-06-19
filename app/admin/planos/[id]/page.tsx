import Link from 'next/link';
import { notFound } from 'next/navigation';
import PlanCommercialForm from '@/components/admin/PlanCommercialForm';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminPlan } from '@/lib/admin/queries';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminPlanDetailPage({ params }: Props) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const plan = await getAdminPlan(admin, id);

  if (!plan) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/planos"
        className="inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-console"
      >
        ← Voltar para planos
      </Link>
      <PlanCommercialForm plan={plan} />
    </div>
  );
}
