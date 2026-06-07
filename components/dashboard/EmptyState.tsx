import Link from 'next/link';

interface Props {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export default function EmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
}: Props) {
  return (
    <div className="border-l-4 border-l-white/15 bg-gradient-to-r from-white/[0.02] to-transparent py-8 pl-6 md:py-10 md:pl-8">
      <p className="font-display text-2xl uppercase tracking-wide text-stone-300 md:text-3xl">
        {title}
      </p>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-500">{description}</p>
      {ctaLabel && ctaHref ? (
        <Link
          href={ctaHref}
          className="mt-6 inline-flex cursor-pointer rounded-sm bg-ember px-6 py-3 font-display text-sm uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
