'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { useStoreCart } from '@/components/store/StoreCartProvider';

import { STORE_ROUTES } from '@/lib/store/routes';

const LINKS = [
  { href: STORE_ROUTES.home, label: 'Produtos' },
  { href: STORE_ROUTES.cart, label: 'Carrinho' },
  { href: STORE_ROUTES.checkout, label: 'Checkout' },
] as const;

export default function StoreSubNav() {
  const pathname = usePathname();
  const { itemCount, hydrated } = useStoreCart();

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <nav
        className="flex flex-wrap gap-2"
        aria-label="Navegação da loja"
      >
        {LINKS.map((link) => {
          const active =
            link.href === STORE_ROUTES.home
              ? pathname === STORE_ROUTES.home
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`inline-flex min-h-[40px] items-center rounded-sm px-4 py-2 font-display text-xs uppercase tracking-widest transition ${
                active
                  ? 'bg-gold/15 text-gold'
                  : 'border border-white/10 text-stone-400 hover:border-white/20 hover:text-white'
              }`}
            >
              {link.label}
              {link.href === STORE_ROUTES.cart &&
              hydrated &&
              itemCount > 0 ? (
                <span className="ml-2 rounded-full bg-ember px-2 py-0.5 text-[10px] text-stone-950">
                  {itemCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <Link
        href={STORE_ROUTES.cart}
        className="inline-flex min-h-[40px] items-center gap-2 rounded-sm border border-white/10 px-4 py-2 text-sm text-stone-300 transition hover:border-gold/30 hover:text-gold"
      >
        <ShoppingBag className="h-4 w-4" aria-hidden="true" />
        Carrinho
        {hydrated && itemCount > 0 ? (
          <span className="font-display text-xs text-gold">({itemCount})</span>
        ) : null}
      </Link>
    </div>
  );
}
