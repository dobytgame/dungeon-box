'use client';

import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import DashboardCard from '@/components/dashboard/DashboardCard';
import ShopCard from '@/components/shop/ShopCard';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import { useStoreCatalog } from '@/components/store/StoreCatalogProvider';
import { formatMoney } from '@/lib/dashboard/format';
import { cartHasMonthlyKits, resolveCartLines } from '@/lib/store/cart';
import { STORE_ROUTES } from '@/lib/store/routes';
import StoreNavLink from '@/components/shop/StoreNavLink';
import { STORE_PRODUCT_IMAGE_SIZE } from '@/lib/store/product-media';

interface Props {
  embedded?: boolean;
}

function CartShell({
  title,
  embedded,
  children,
}: {
  title: string;
  embedded?: boolean;
  children: React.ReactNode;
}) {
  if (embedded) {
    return (
      <ShopCard title={title} eyebrow="Loja">
        {children}
      </ShopCard>
    );
  }

  return (
    <DashboardCard title={title} accent="gold">
      {children}
    </DashboardCard>
  );
}

export default function StoreCartView({ embedded = false }: Props) {
  const { allProducts } = useStoreCatalog();
  const { lines, subtotalCents, setQuantity, removeItem, hydrated } = useStoreCart();
  const resolved = resolveCartLines(lines, allProducts);
  const hasMonthlyKit = cartHasMonthlyKits(lines, allProducts);

  if (!hydrated) {
    return (
      <CartShell title="Carrinho" embedded={embedded}>
        <p className="text-sm text-stone-500">Carregando carrinho…</p>
      </CartShell>
    );
  }

  if (resolved.length === 0) {
    return (
      <CartShell title="Carrinho vazio" embedded={embedded}>
        <p className="text-sm text-stone-400">
          Você ainda não adicionou produtos. Explore a loja para kits do mês e
          acessórios.
        </p>
        <Link
          href={STORE_ROUTES.home}
          className="mt-4 inline-flex font-display text-xs uppercase tracking-widest text-ember hover:text-ember-bright"
        >
          Ver produtos →
        </Link>
      </CartShell>
    );
  }

  return (
    <div className="space-y-6">
      <CartShell title="Seu carrinho" embedded={embedded}>
        <ul className="divide-y divide-white/[0.06]">
          {resolved.map((line) => {
            const productHref = line.slug
              ? STORE_ROUTES.product(line.slug)
              : STORE_ROUTES.home;

            return (
            <li
              key={line.lineId}
              className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-1 gap-4">
                <Link
                  href={productHref}
                  className="relative h-20 w-20 shrink-0 self-start overflow-hidden rounded-sm bg-stone-900"
                >
                  {line.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={line.imageUrl}
                      alt=""
                      width={STORE_PRODUCT_IMAGE_SIZE}
                      height={STORE_PRODUCT_IMAGE_SIZE}
                      className="h-full w-full object-cover transition hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center">
                      <ShoppingBag
                        className="h-6 w-6 text-stone-600"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </Link>

                <div className="min-w-0">
                <p className="font-medium text-white">
                  <Link href={productHref} className="hover:text-ember">
                    {line.name}
                  </Link>
                </p>
                {line.themeName ? (
                  <p className="mt-1 text-xs text-gold">Tema: {line.themeName}</p>
                ) : null}
                {line.variationSummary ? (
                  <p className="mt-1 text-xs text-stone-400">{line.variationSummary}</p>
                ) : null}
                {line.requiresUnitUploads ? (
                  <p className="mt-1 text-xs text-amber-200/80">
                    {line.itemUploads?.length ?? line.quantity} imagem(ns) de
                    personalização
                  </p>
                ) : null}
                <p className="mt-1 text-sm text-stone-500">
                  {line.originalPriceCents &&
                  line.originalPriceCents > line.priceCents ? (
                    <>
                      <span className="line-through">
                        {formatMoney(line.originalPriceCents)}
                      </span>{' '}
                      {formatMoney(line.priceCents)} cada
                    </>
                  ) : (
                    <>{formatMoney(line.priceCents)} cada</>
                  )}
                </p>
                {line.promoCode ? (
                  <p className="mt-1 text-xs text-gold/80">
                    Cupom {line.promoCode}
                    {line.promoSummary ? ` — ${line.promoSummary}` : ''}
                  </p>
                ) : null}
                </div>
              </div>

              <div className="flex w-full flex-wrap items-center justify-between gap-4 sm:w-auto">
                {line.requiresUnitUploads ? (
                  <p className="text-xs text-stone-500">
                    Qtd. fixa — altere na página do produto
                  </p>
                ) : (
                <div className="flex items-center rounded-sm border border-white/10">
                  <button
                    type="button"
                    aria-label="Diminuir quantidade"
                    onClick={() => {
                      if (line.quantity <= 1) {
                        removeItem(line.lineId);
                        return;
                      }
                      setQuantity(line.lineId, line.quantity - 1);
                    }}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center text-stone-400 hover:text-white"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[2rem] text-center text-sm text-white">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Aumentar quantidade"
                    disabled={line.quantity >= (line.maxQuantity ?? 9)}
                    onClick={() =>
                      setQuantity(
                        line.lineId,
                        Math.min(line.maxQuantity ?? 9, line.quantity + 1)
                      )
                    }
                    className="flex h-11 w-11 cursor-pointer items-center justify-center text-stone-400 hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                )}

                <p className="min-w-[5rem] text-right font-display text-sm text-gold">
                  {formatMoney(line.lineTotalCents)}
                </p>

                <button
                  type="button"
                  aria-label={`Remover ${line.name}`}
                  onClick={() => removeItem(line.lineId)}
                  className="cursor-pointer text-stone-500 transition hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
            );
          })}
        </ul>

        <div className="mt-6 flex flex-col gap-4 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-stone-500">Subtotal</p>
            <p className="font-display text-2xl text-white">
              {formatMoney(subtotalCents)}
            </p>
            <p className="mt-1 text-xs text-stone-600">
              {hasMonthlyKit
                ? 'Kits do mês: frete grátis na próxima caixa da assinatura.'
                : 'Frete avulso calculado por região no checkout.'}
            </p>
          </div>
          <StoreNavLink
            href={STORE_ROUTES.checkout}
            loadingLabel="Abrindo pagamento…"
            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-sm bg-ember px-6 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
          >
            Finalizar compra
          </StoreNavLink>
        </div>
      </CartShell>
    </div>
  );
}
