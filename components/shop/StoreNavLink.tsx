'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition, type ReactNode } from 'react';

interface Props {
  href: string;
  children: ReactNode;
  className?: string;
  loadingLabel?: string;
  onNavigate?: () => void;
}

function isModifiedClick(event: React.MouseEvent<HTMLAnchorElement>) {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

export default function StoreNavLink({
  href,
  children,
  className = '',
  loadingLabel = 'Carregando…',
  onNavigate,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Link
      href={href}
      aria-busy={isPending}
      onClick={(event) => {
        if (isModifiedClick(event)) return;
        event.preventDefault();
        onNavigate?.();
        startTransition(() => {
          router.push(href);
        });
      }}
      className={`${className} ${isPending ? 'pointer-events-none' : ''}`}
    >
      {isPending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {loadingLabel}
        </span>
      ) : (
        children
      )}
    </Link>
  );
}
