import HomeV2Button from '@/components/home-v2/HomeV2Button';

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
    <div className="rounded-2xl border border-white/10 bg-mesa-stone px-6 py-8 md:px-8 md:py-10">
      <p className="home-v2-display text-2xl leading-none text-mesa-parchment md:text-3xl">
        {title}
      </p>
      <p className="mt-3 max-w-md text-base leading-relaxed text-mesa-ash">{description}</p>
      {ctaLabel && ctaHref ? (
        <HomeV2Button href={ctaHref} size="sm" arrow className="mt-6">
          {ctaLabel}
        </HomeV2Button>
      ) : null}
    </div>
  );
}
