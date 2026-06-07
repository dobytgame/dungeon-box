import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export default function CheckoutSection({
  title,
  subtitle,
  children,
  className = '',
}: Props) {
  return (
    <section className={className}>
      <header className="mb-4">
        <h2 className="font-display text-xs uppercase tracking-[0.28em] text-stone-400">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{subtitle}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
