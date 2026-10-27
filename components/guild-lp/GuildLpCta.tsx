'use client';

import Link from 'next/link';

interface Props {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
  /** Abre em nova aba (WhatsApp, convite do grupo). Links internos usam mesma aba. */
  external?: boolean;
  onClick?: () => void;
}

function ctaClassName(variant: 'primary' | 'secondary', className: string) {
  const styles =
    variant === 'primary'
      ? 'border border-relic-gold bg-relic-gold text-relic-ink hover:bg-relic-goldLight hover:border-relic-goldLight hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,107,43,0.3)]'
      : 'border border-relic-gold/50 bg-transparent text-relic-gold hover:border-relic-gold hover:bg-relic-gold/10';

  return `inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded px-6 py-4 text-center font-cinzel text-[17px] font-bold uppercase tracking-[0.08em] transition-[color,background-color,border-color,transform,box-shadow] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-relic-gold motion-reduce:transform-none sm:w-auto sm:min-h-[56px] sm:px-10 sm:text-lg ${styles} ${className}`;
}

export default function GuildLpCta({
  href,
  children,
  variant = 'primary',
  className = '',
  external = false,
  onClick,
}: Props) {
  const classNames = ctaClassName(variant, className);
  const isExternal =
    external || href.startsWith('http://') || href.startsWith('https://');

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classNames}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classNames} onClick={onClick}>
      {children}
    </Link>
  );
}
