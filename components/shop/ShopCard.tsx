import type { ReactNode } from 'react';

interface Props {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}

export default function ShopCard({ title, eyebrow, children, className = '' }: Props) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-mesa-stone p-6 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.9)] sm:p-8 ${className}`}
    >
      {eyebrow ? (
        <p className="home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade">{eyebrow}</p>
      ) : null}
      {title ? (
        <h2 className="home-v2-display mt-3 text-[clamp(1.75rem,4vw,2.25rem)] leading-[0.95] text-mesa-parchment">
          {title}
        </h2>
      ) : null}
      <div className={title || eyebrow ? 'mt-6' : undefined}>{children}</div>
    </section>
  );
}
