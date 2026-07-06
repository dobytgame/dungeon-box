import AdminPlanChip from '@/components/admin/AdminPlanChip';
import type { PlanSlug } from '@/lib/plan-theme';

const PLAN_ORDER: PlanSlug[] = ['aventureiro', 'heroi', 'lendario'];

export default function AdminPlanLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">
        Planos
      </span>
      {PLAN_ORDER.map((slug) => (
        <AdminPlanChip key={slug} slug={slug} compact />
      ))}
    </div>
  );
}
