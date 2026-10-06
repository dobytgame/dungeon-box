'use client';

import Link from 'next/link';
import { homeV2ButtonClassName } from '@/components/home-v2/HomeV2Button';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import DashboardCard from '@/components/dashboard/DashboardCard';
import ShopCard from '@/components/shop/ShopCard';
import StoreNavLink from '@/components/shop/StoreNavLink';
import CartValidationBanner from '@/components/store/CartValidationBanner';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import { useStoreCatalog } from '@/components/store/StoreCatalogProvider';
import StoreMediaImage from '@/components/store/StoreMediaImage';
import { formatMoney } from '@/lib/dashboard/format';
import { cartHasMonthlyKits, resolveCartLines } from '@/lib/store/cart';
import { maxQuantityForCartLine } from '@/lib/store/cart-validation';
import { STORE_ROUTES } from '@/lib/store/routes';
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
    <DashboardCard title={title} accent="jade">
      {children}
    </DashboardCard>
  );
}

export default function StoreCartView({ embedded = false }: Props) {
  const { allProducts } = useStoreCatalog();
  const { lines, subtotalCents, setQuantity, removeItem, hydrated, validationIssues, cartIsValid } =
    useStoreCart();
  const resolved = resolveCartLines(lines, allProducts);
  const hasMonthlyKit = cartHasMonthlyKits(lines, allProducts);

  if (!hydrated) {
    return (
      <CartShell title="Carrinho" embedded={embedded}>
        <p className="text-sm text-mesa-ash">Carregando carrinho…</p>
      </CartShell>
    );
  }

  if (resolved.length === 0) {
    return (
      <CartShell title="Carrinho vazio" embedded={embedded}>
        <p className="text-base leading-relaxed text-mesa-ash">
          Você ainda não adicionou produtos. Explore a loja para kits do mês e
          acessórios.
        </p>
        <Link
          href={STORE_ROUTES.home}
          className={homeV2ButtonClassName({ className: 'mt-6 w-full gap-2 sm:w-auto' })}
        >
          Ver produtos
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </CartShell>
    );
  }

  return (
    <div className="space-y-6">
      <CartShell title="Seu carrinho" embedded={embedded}>
        <ul className="divide-y divide-white/10">
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
                  className="relative h-20 w-20 shrink-0 self-start overflow-hidden rounded-sm bg-mesa-stone"
                >
                  {line.imageUrl ? (
                    <StoreMediaImage
                      src={line.imageUrl}
                      alt=""
                      width={STORE_PRODUCT_IMAGE_SIZE}
                      height={STORE_PRODUCT_IMAGE_SIZE}
                      sizes="80px"
                      className="h-full w-full object-cover transition hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center">
                      <ShoppingBag
                        className="h-6 w-6 text-mesa-ash/70"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </Link>

                <div className="min-w-0">
                <p className="font-medium text-mesa-parchment">
                  <Link href={productHref} className="hover:text-mesa-ember">
                    {line.name}
                  </Link>
                </p>
                {line.themeName ? (
                  <p className="mt-1 text-xs text-mesa-jade">Tema: {line.themeName}</p>
                ) : null}
                {line.variationSummary ? (
                  <p className="mt-1 text-xs text-mesa-ash">{line.variationSummary}</p>
                ) : null}
                {line.requiresUnitUploads ? (
                  line.uploadsComplete === false ? (
                    <div className="mt-2 rounded-sm border border-amber-500/25 bg-amber-500/10 px-3 py-2">
                      <p className="text-xs text-amber-100">
                        Faltam imagens de personalização (
                        {line.itemUploads?.length ?? 0}/{line.quantity}).
                      </p>
                      <Link
                        href={productHref}
                        className="mt-1 inline-flex font-display text-[10px] uppercase tracking-widest text-mesa-ember hover:text-[#ff7a4a]"
                      >
                        Enviar imagens na página do produto →
                      </Link>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-mesa-ash">
                      {line.itemUploads?.length ?? line.quantity} imagem(ns) de
                      personalização
                    </p>
                  )
                ) : null}
                <p className="mt-1 text-sm text-mesa-ash">
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
                  <p className="mt-1 text-xs text-mesa-jade">
                    Cupom {line.promoCode}
                    {line.promoSummary ? ` — ${line.promoSummary}` : ''}
                  </p>
                ) : null}
                </div>
              </div>

              <div className="flex w-full flex-wrap items-center justify-between gap-4 sm:w-auto">
                {line.requiresUnitUploads ? (
                  <p className="text-xs text-mesa-ash">
                    {line.quantity} un. · altere na página do produto
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
                    className="flex h-11 w-11 cursor-pointer items-center justify-center text-mesa-ash hover:text-mesa-parchment"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[2rem] text-center text-sm text-mesa-parchment">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Aumentar quantidade"
                    disabled={
                      line.quantity >= maxQuantityForCartLine(line, lines, allProducts)
                    }
                    onClick={() =>
                      setQuantity(
                        line.lineId,
                        Math.min(
                          maxQuantityForCartLine(line, lines, allProducts),
                          line.quantity + 1
                        )
                      )
                    }
                    className="flex h-11 w-11 cursor-pointer items-center justify-center text-mesa-ash hover:text-mesa-parchment disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                )}

                <p className="min-w-[5rem] text-right font-display text-sm text-mesa-jade">
                  {formatMoney(line.lineTotalCents)}
                </p>

                <button
                  type="button"
                  aria-label={`Remover ${line.name}`}
                  onClick={() => removeItem(line.lineId)}
                  className="cursor-pointer text-mesa-ash transition hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
            );
          })}
        </ul>

        {validationIssues.length > 0 ? (
          <div className="mt-6">
            <CartValidationBanner issues={validationIssues} />
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-mesa-ash">Subtotal</p>
            <p className="font-display text-2xl text-mesa-parchment">
              {formatMoney(subtotalCents)}
            </p>
            <p className="mt-1 text-xs text-mesa-ash/70">
              {hasMonthlyKit
                ? 'Kits do mês: frete grátis na próxima caixa da assinatura.'
                : 'Frete avulso calculado por região no checkout.'}
            </p>
          </div>
          <StoreNavLink
            href={STORE_ROUTES.checkout}
            loadingLabel="Abrindo pagamento…"
            disabled={!cartIsValid}
            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-sm bg-mesa-ember px-6 py-3 font-display text-xs uppercase tracking-widest text-mesa-ink transition hover:bg-[#ff7a4a]"
          >
            Finalizar compra
          </StoreNavLink>
        </div>
      </CartShell>
    </div>
  );
}
