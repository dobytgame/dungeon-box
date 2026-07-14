'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, User } from 'lucide-react';
import CartDrawer from '@/components/shop/CartDrawer';
import Logo from '@/components/ui/Logo';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import { siteNavLinkClassName } from '@/lib/ui/site-nav';
import type { StoreCategory } from '@/lib/store/load-catalog';
import { STORE_ROUTES } from '@/lib/store/routes';

interface Props {
  categories: StoreCategory[];
  isLoggedIn: boolean;
  userName?: string | null;
}

export default function ShopHeader({
  categories,
  isLoggedIn,
  userName,
}: Props) {
  const pathname = usePathname();
  const {
    itemCount,
    hydrated,
    cartDrawerOpen,
    openCartDrawer,
    closeCartDrawer,
    cartBump,
  } = useStoreCart();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0A0C10]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-6 lg:gap-10">
          <Logo variant="nav" href={STORE_ROUTES.home} />

          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Categorias da loja"
          >
            {categories.map((category) => {
              const href = STORE_ROUTES.category(category.slug);
              const active = pathname === href;

              return (
                <Link
                  key={category.slug}
                  href={href}
                  className={`rounded-sm px-3 py-2 transition ${siteNavLinkClassName} ${
                    active
                      ? 'bg-ember/15 text-ember'
                      : 'text-stone-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {category.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href={isLoggedIn ? '/dashboard' : '/auth'}
            className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-sm border border-white/10 text-stone-400 transition hover:border-ember/40 hover:text-ember sm:hidden"
            aria-label={isLoggedIn ? 'Minha conta' : 'Entrar'}
          >
            <User className="h-4 w-4" aria-hidden="true" />
          </Link>

          <Link
            href="/#planos"
            className="hidden rounded-sm border border-white/10 px-3 py-2 font-display text-[10px] uppercase tracking-widest text-stone-300 transition hover:border-ember/40 hover:text-ember sm:inline-flex"
          >
            Assinatura
          </Link>

          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="hidden text-sm text-stone-400 transition hover:text-white sm:inline"
            >
              {userName ? userName.split(' ')[0] : 'Conta'}
            </Link>
          ) : (
            <Link
              href="/auth"
              className="hidden text-sm text-stone-500 transition hover:text-white sm:inline"
            >
              Entrar
            </Link>
          )}

          <button
            type="button"
            onClick={openCartDrawer}
            className="relative inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center gap-2 rounded-sm border border-white/10 px-3 py-2 text-sm text-stone-300 transition hover:border-ember/40 hover:text-ember"
            aria-label={`Carrinho${hydrated && itemCount > 0 ? `, ${itemCount} itens` : ''}`}
          >
            <ShoppingBag
              key={cartBump}
              className={`h-4 w-4 ${cartBump > 0 ? 'animate-store-cart-bump' : ''}`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Carrinho</span>
            {hydrated && itemCount > 0 ? (
              <span
                key={`count-${cartBump}`}
                className="inline-flex h-5 min-w-[1.25rem] animate-store-cart-bump items-center justify-center rounded-full bg-ember px-1.5 font-display text-[10px] text-stone-950"
              >
                {itemCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {categories.length > 0 ? (
        <nav
          className="flex gap-2 overflow-x-auto border-t border-white/[0.06] px-4 py-2 md:hidden"
          aria-label="Categorias da loja"
        >
          {categories.map((category) => {
            const href = STORE_ROUTES.category(category.slug);
            const active = pathname === href;

            return (
              <Link
                key={category.slug}
                href={href}
                className={`shrink-0 rounded-sm px-3 py-2.5 transition ${siteNavLinkClassName} ${
                  active
                    ? 'bg-ember/15 text-ember'
                    : 'border border-white/10 text-stone-400'
                }`}
              >
                {category.name}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <CartDrawer open={cartDrawerOpen} onClose={closeCartDrawer} />
    </header>
  );
}
