'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, User } from 'lucide-react';
import CartDrawer from '@/components/shop/CartDrawer';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import Logo from '@/components/ui/Logo';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import type { StoreCategory } from '@/lib/store/load-catalog';
import { STORE_ROUTES } from '@/lib/store/routes';

interface Props {
  categories: StoreCategory[];
  isLoggedIn: boolean;
  userName?: string | null;
}

function accountLabel(isLoggedIn: boolean, userName?: string | null): string {
  if (!isLoggedIn) return 'Entrar';
  const firstName = userName?.trim().split(' ')[0];
  return firstName ? `Olá, ${firstName}` : 'Minha conta';
}

export default function ShopHeader({ categories, isLoggedIn, userName }: Props) {
  const pathname = usePathname();
  const { itemCount, hydrated, cartDrawerOpen, openCartDrawer, closeCartDrawer, cartBump } =
    useStoreCart();
  const accountHref = isLoggedIn ? '/dashboard' : '/auth';
  const hasItems = hydrated && itemCount > 0;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-mesa-ink/85 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-[75rem] items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-6 lg:gap-10">
          <Logo variant="nav" href={STORE_ROUTES.home} className="h-12 sm:h-14" />

          <nav className="hidden md:block" aria-label="Categorias da loja">
            <ul className="flex items-center gap-1">
              {categories.map((category) => {
                const href = STORE_ROUTES.category(category.slug);
                const active = pathname === href;
                return (
                  <li key={category.slug}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={`relative block cursor-pointer rounded-sm px-3 py-2 text-sm font-medium transition-colors duration-200 after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:origin-left after:bg-mesa-ember after:transition-transform after:duration-300 ${
                        active
                          ? 'text-mesa-parchment after:scale-x-100'
                          : 'text-mesa-ash after:scale-x-0 hover:text-mesa-parchment'
                      }`}
                    >
                      {category.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <HomeV2Button href="/#planos" variant="outline" size="sm" className="hidden lg:inline-flex">
            Assinatura
          </HomeV2Button>
          <Link
            href={accountHref}
            className="hidden min-h-11 items-center rounded-sm px-2 text-sm font-medium text-mesa-ash transition-colors duration-200 hover:text-mesa-parchment sm:inline-flex"
          >
            {accountLabel(isLoggedIn, userName)}
          </Link>
          <Link
            href={accountHref}
            className="flex size-11 cursor-pointer items-center justify-center rounded-sm border border-white/10 text-mesa-parchment transition-colors hover:border-white/30 sm:hidden"
            aria-label={isLoggedIn ? 'Minha conta' : 'Entrar'}
          >
            <User className="size-[18px]" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={openCartDrawer}
            className={`relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors duration-200 ${
              hasItems
                ? 'bg-mesa-ember text-mesa-ink hover:bg-[#ff7a4a]'
                : 'border border-white/10 text-mesa-parchment hover:border-white/30'
            }`}
            aria-label={`Carrinho${hasItems ? `, ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}` : ''}`}
          >
            <ShoppingBag
              key={cartBump}
              className={`size-[18px] ${cartBump > 0 ? 'animate-store-cart-bump' : ''}`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Carrinho</span>
            {hasItems ? (
              <span
                key={`count-${cartBump}`}
                className="home-v2-display inline-flex h-5 min-w-5 animate-store-cart-bump items-center justify-center rounded-full bg-mesa-ink px-1.5 text-[11px] tabular-nums text-mesa-parchment"
              >
                {itemCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {categories.length > 0 ? (
        <nav className="border-t border-white/[0.06] md:hidden" aria-label="Categorias da loja">
          <ul className="home-v2-snap flex scroll-px-4 gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <li className="shrink-0">
              <Link
                href={STORE_ROUTES.home}
                aria-current={pathname === STORE_ROUTES.home ? 'page' : undefined}
                className={chipClass(pathname === STORE_ROUTES.home)}
              >
                Início
              </Link>
            </li>
            {categories.map((category) => {
              const href = STORE_ROUTES.category(category.slug);
              const active = pathname === href;
              return (
                <li key={category.slug} className="shrink-0">
                  <Link href={href} aria-current={active ? 'page' : undefined} className={chipClass(active)}>
                    {category.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}

      <CartDrawer open={cartDrawerOpen} onClose={closeCartDrawer} />
    </header>
  );
}

function chipClass(active: boolean) {
  return `flex min-h-10 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors duration-200 ${
    active
      ? 'border-mesa-parchment bg-mesa-parchment text-mesa-ink'
      : 'border-white/10 text-mesa-ash hover:border-white/25 hover:text-mesa-parchment'
  }`;
}
