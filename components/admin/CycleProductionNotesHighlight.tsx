interface Props {
  notes: string;
  compact?: boolean;
}

export default function CycleProductionNotesHighlight({
  notes,
  compact = false,
}: Props) {
  const trimmed = notes.trim();
  if (!trimmed) return null;

  if (compact) {
    return (
      <div className="rounded border border-amber-400/35 bg-amber-500/10 px-2.5 py-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-amber-200/90">
          Comentário
        </p>
        <p className="mt-1 line-clamp-3 text-[11px] font-medium leading-snug text-amber-50">
          {trimmed}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded border border-amber-400/35 bg-amber-500/10 px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-amber-200/90">
        Comentário do pedido
      </p>
      <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-amber-50">
        {trimmed}
      </p>
    </div>
  );
}
