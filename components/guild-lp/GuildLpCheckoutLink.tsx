'use client';

import Link from 'next/link';
import type { PlanSlug } from '@/lib/checkout/plans';
import { trackGuildCheckoutClick } from '@/lib/guild-lp/analytics';

interface Props {
  href: string;
  planId: PlanSlug;
  position?: string;
  children: React.ReactNode;
  className?: string;
}

export default function GuildLpCheckoutLink({
  href,
  planId,
  position = 'plan_card',
  children,
  className = '',
}: Props) {
  return (
    <Link
      href={href}
      onClick={() => trackGuildCheckoutClick(planId, position)}
      className={`inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded border border-relic-gold bg-relic-gold px-5 py-3 text-center font-cinzel text-[15px] font-bold uppercase tracking-[0.08em] text-relic-ink transition-[color,background-color,border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-relic-goldLight hover:bg-relic-goldLight hover:shadow-[0_8px_24px_rgba(255,107,43,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-relic-gold motion-reduce:transform-none sm:min-h-[52px] sm:text-base ${className}`}
    >
      {children}
    </Link>
  );
}
