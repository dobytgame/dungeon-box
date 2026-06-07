import type { ReactNode } from 'react';

interface Props {
  eyebrow: string;
  title: ReactNode;
  description?: string;
}

export default function DashboardPageIntro({ eyebrow, title, description }: Props) {
  return (
    <header className="max-w-2xl border-b border-white/[0.06] pb-8 md:pb-10">
      <p className="font-display text-xs uppercase tracking-[0.35em] text-frost">
        {eyebrow}
      </p>
      <h1 className="mt-3 font-display text-3xl uppercase leading-[0.95] tracking-wide text-white sm:text-4xl md:text-5xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-400">
          {description}
        </p>
      ) : null}
    </header>
  );
}
