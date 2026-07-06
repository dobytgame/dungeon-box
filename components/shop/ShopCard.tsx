import type { ReactNode } from 'react';

interface Props {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}

export default function ShopCard({
  title,
  eyebrow,
  children,
  className = '',
}: Props) {
  return (
    <section
      className={`rounded-sm border border-white/[0.08] bg-stone-950/60 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-8 ${className}`}
    >
      {eyebrow ? (
        <p className="font-display text-xs uppercase tracking-[0.25em] text-ember/80">
          {eyebrow}
        </p>
      ) : null}
      {title ? (
        <h2 className="mt-2 font-display text-xl uppercase tracking-wide text-white sm:text-2xl">
          {title}
        </h2>
      ) : null}
      <div className={title || eyebrow ? 'mt-6' : undefined}>{children}</div>
    </section>
  );
}
