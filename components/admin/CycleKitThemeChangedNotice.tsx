interface Props {
  notice: string;
  compact?: boolean;
}

export default function CycleKitThemeChangedNotice({
  notice,
  compact = false,
}: Props) {
  const trimmed = notice.trim();
  if (!trimmed) return null;

  if (compact) {
    return (
      <div className="rounded border border-sky-400/35 bg-sky-500/10 px-2.5 py-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-sky-200/90">
          Tema alterado
        </p>
        <p className="mt-1 line-clamp-3 text-[11px] font-medium leading-snug text-sky-50">
          {trimmed}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded border border-sky-400/35 bg-sky-500/10 px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-sky-200/90">
        Tema alterado pelo assinante
      </p>
      <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-sky-50">
        {trimmed}
      </p>
    </div>
  );
}
