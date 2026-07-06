import { getAdminPlanVisual } from '@/lib/plan-theme';

interface Props {
  slug?: string | null;
  name?: string | null;
  compact?: boolean;
}

export default function AdminPlanChip({ slug, name, compact = false }: Props) {
  const visual = getAdminPlanVisual(slug, name);
  const label = name ?? visual?.label ?? '—';

  if (!visual) {
    return (
      <span className={compact ? 'text-zinc-400' : 'text-sm text-zinc-400'}>
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded border font-mono uppercase tracking-[0.14em] ${visual.badgeClass} ${
        compact
          ? 'px-1.5 py-0.5 text-[9px]'
          : 'px-2 py-0.5 text-[10px]'
      }`}
    >
      {label}
    </span>
  );
}
