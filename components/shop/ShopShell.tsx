import type { ReactNode } from 'react';
import ShellNavigationFrame from '@/components/navigation/ShellNavigationFrame';
import ShopPromoBar from '@/components/shop/ShopPromoBar';
import StoreCartFeedback from '@/components/shop/StoreCartFeedback';
import ShopFooter from '@/components/shop/ShopFooter';
import ShopHeader from '@/components/shop/ShopHeader';
import type { StoreCategory } from '@/lib/store/load-catalog';

interface Props {
  children: ReactNode;
  categories: StoreCategory[];
  isLoggedIn: boolean;
  userName?: string | null;
}

export default function ShopShell({
  children,
  categories,
  isLoggedIn,
  userName,
}: Props) {
  return (
    <ShellNavigationFrame scope="/loja" variant="shop">
      <div className="flex min-h-screen flex-col bg-[#0A0C10] text-stone-200">
        <div
          className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.06),transparent_55%)]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none fixed inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          }}
          aria-hidden="true"
        />

        <div className="relative flex min-h-screen flex-col">
          <ShopPromoBar />
          <ShopHeader
            categories={categories}
            isLoggedIn={isLoggedIn}
            userName={userName}
          />
          <main id="conteudo-principal" className="relative flex-1">
            {children}
          </main>
          <ShopFooter isLoggedIn={isLoggedIn} />
          <StoreCartFeedback />
        </div>
      </div>
    </ShellNavigationFrame>
  );
}
