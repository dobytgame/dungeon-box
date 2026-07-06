import Link from 'next/link';

interface Props {
  backHref: string;
  backLabel: string;
  createHref?: string;
  createLabel?: string;
}

export default function AdminFormNav({
  backHref,
  backLabel,
  createHref,
  createLabel = 'Criar novo',
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link
        href={backHref}
        className="inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-console"
      >
        ← {backLabel}
      </Link>
      {createHref ? (
        <Link
          href={createHref}
          className="inline-flex min-h-[36px] items-center rounded-sm border border-white/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-stone-300 transition hover:border-console/40 hover:text-console"
        >
          {createLabel}
        </Link>
      ) : null}
    </div>
  );
}
