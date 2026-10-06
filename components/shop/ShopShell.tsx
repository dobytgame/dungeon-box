import type { ReactNode } from 'react';
import HomeV2Footer from '@/components/home-v2/HomeV2Footer';
import HomeV2Motion from '@/components/home-v2/HomeV2Motion';
import ShellNavigationFrame from '@/components/navigation/ShellNavigationFrame';
import ShopPromoBar from '@/components/shop/ShopPromoBar';
import StoreCartFeedback from '@/components/shop/StoreCartFeedback';
import ShopHeader from '@/components/shop/ShopHeader';
import { mesaFontVariables } from '@/lib/fonts/mesa';
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
      <div
        className={`${mesaFontVariables} home-v2 home-v2-shop flex min-h-screen flex-col bg-mesa-ink text-mesa-parchment`}
      >
        <a
          href="#conteudo-principal"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:bg-mesa-ember focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-mesa-ink"
        >
          Pular para o conteúdo
        </a>
        <HomeV2Motion />
        <ShopPromoBar />
        <ShopHeader categories={categories} isLoggedIn={isLoggedIn} userName={userName} />
        <main id="conteudo-principal" className="relative flex-1 overflow-x-clip">
          {children}
        </main>
        <div className="mt-auto">
          <HomeV2Footer context="shop" />
        </div>
        <StoreCartFeedback />
      </div>
    </ShellNavigationFrame>
  );
}
