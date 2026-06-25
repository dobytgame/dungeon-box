export default function PartnerBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border border-violet-400/30 bg-violet-500/10 font-mono uppercase tracking-wider text-violet-200 ${
        compact
          ? 'px-1.5 py-0.5 text-[9px]'
          : 'px-2.5 py-1 text-[10px]'
      }`}
    >
      Parceiro
    </span>
  );
}
