import type { ReactNode } from 'react';

interface Props {
  eyebrow: string;
  title: ReactNode;
  description?: string;
}

export default function DashboardPageIntro({ eyebrow, title, description }: Props) {
  return (
    <header className="max-w-3xl">
      <p className="home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade">{eyebrow}</p>
      <h1 className="home-v2-display mt-3 text-[clamp(2rem,7vw,3.4rem)] leading-[0.92] tracking-wide text-balance text-mesa-parchment">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 max-w-xl text-base leading-relaxed text-pretty text-mesa-ash">
          {description}
        </p>
      ) : null}
      <div className="home-v2-hairline mt-8 h-px" aria-hidden="true" />
    </header>
  );
}
