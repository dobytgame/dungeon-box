import type { ReactNode } from 'react';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import HomeV2SectionHeading from '@/components/home-v2/HomeV2SectionHeading';

interface Props {
  titleId: string;
  title: string;
  eyebrow?: string;
  support?: string;
  viewAll?: { href: string; label?: string };
  /** Extra controls aligned with the heading (e.g. slider arrows). */
  aside?: ReactNode;
  tone?: 'ink' | 'stone';
  id?: string;
  children: ReactNode;
}

export default function ShopSection({
  titleId,
  title,
  eyebrow,
  support,
  viewAll,
  aside,
  tone = 'ink',
  id,
  children,
}: Props) {
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={`scroll-mt-28 px-4 py-14 sm:px-6 md:py-20 ${
        tone === 'stone' ? 'border-y border-white/10 bg-mesa-stone' : 'bg-mesa-ink'
      }`}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <HomeV2SectionHeading
            eyebrow={eyebrow}
            title={title}
            titleId={titleId}
            support={support}
            size="md"
          />
          {viewAll || aside ? (
            <div className="home-v2-reveal flex shrink-0 items-center gap-3">
              {aside}
              {viewAll ? (
                <HomeV2Button href={viewAll.href} variant="outline" size="sm" arrow>
                  {viewAll.label ?? 'Ver todos'}
                </HomeV2Button>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
