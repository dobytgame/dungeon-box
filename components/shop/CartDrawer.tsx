'use client';

import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import { useStoreCatalog } from '@/components/store/StoreCatalogProvider';
import StoreMediaImage from '@/components/store/StoreMediaImage';
import { formatMoney } from '@/lib/dashboard/format';
import { resolveCartLines } from '@/lib/store/cart';
import { maxQuantityForCartLine } from '@/lib/store/cart-validation';
import { STORE_PRODUCT_IMAGE_SIZE } from '@/lib/store/product-media';
import { STORE_ROUTES } from '@/lib/store/routes';
import StoreNavLink from '@/components/shop/StoreNavLink';
import CartValidationBanner from '@/components/store/CartValidationBanner';
import { homeV2ButtonClassName } from '@/components/home-v2/HomeV2Button';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const { allProducts } = useStoreCatalog();
  const { lines, subtotalCents, setQuantity, removeItem, hydrated, validationIssues, cartIsValid } =
    useStoreCart();
  const resolved = resolveCartLines(lines, allProducts);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  function decreaseQuantity(
    lineId: string,
    currentQuantity: number
  ) {
    if (currentQuantity <= 1) {
      removeItem(lineId);
      return;
    }
    setQuantity(lineId, currentQuantity - 1);
  }

  function increaseQuantity(
    lineId: string,
    currentQuantity: number,
    line: (typeof resolved)[number]
  ) {
    const maxQuantity = maxQuantityForCartLine(line, lines, allProducts);
    setQuantity(lineId, Math.min(maxQuantity, currentQuantity + 1));
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="home-v2-shop fixed inset-0 z-[200] font-body" role="presentation">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 cursor-pointer bg-mesa-ink/70 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Fechar carrinho"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="absolute right-0 top-0 grid h-full max-h-[100dvh] w-full max-w-md grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-l border-white/10 bg-mesa-ink text-mesa-parchment shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Carrinho de compras"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-5 text-mesa-ember" aria-hidden="true" />
                <h2 className="home-v2-display text-xl leading-none tracking-[0.08em] text-mesa-parchment">
                  Carrinho
                  {hydrated && resolved.length > 0 ? (
                    <span className="ml-2 tabular-nums text-mesa-ash">
                      ({resolved.reduce((sum, line) => sum + line.quantity, 0)})
                    </span>
                  ) : null}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex size-11 cursor-pointer items-center justify-center rounded-sm text-mesa-ash transition-colors hover:text-mesa-parchment"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-2">
              {!hydrated ? (
                <p className="py-6 text-sm text-mesa-ash">Carregando…</p>
              ) : resolved.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="home-v2-grid mb-5 flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-mesa-stone">
                    <ShoppingBag className="size-7 text-mesa-ash" aria-hidden="true" />
                  </div>
                  <p className="home-v2-display text-2xl leading-none text-mesa-parchment">Seu carrinho está vazio</p>
                  <p className="mt-2 max-w-xs text-sm text-mesa-ash">Kits, miniaturas e acessórios esperando para entrar na sua mesa.</p>
                  <Link
                    href={STORE_ROUTES.home}
                    onClick={onClose}
                    className={homeV2ButtonClassName({ variant: 'outline', size: 'sm', className: 'mt-6' })}
                  >
                    Ver produtos
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-white/10">
                  {resolved.map((line) => {
                    const maxQty = maxQuantityForCartLine(line, lines, allProducts);
                    const productHref = line.slug
                      ? STORE_ROUTES.product(line.slug)
                      : STORE_ROUTES.home;

                    return (
                      <li key={line.lineId} className="flex gap-3 py-4">
                        <Link
                          href={productHref}
                          onClick={onClose}
                          className="relative size-20 shrink-0 self-start overflow-hidden rounded-lg border border-white/10 bg-mesa-stone"
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
                                className="size-6 text-mesa-ash"
                                aria-hidden="true"
                              />
                            </div>
                          )}
                        </Link>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <Link
                                href={productHref}
                                onClick={onClose}
                                className="line-clamp-2 text-sm font-semibold leading-snug text-mesa-parchment transition-colors hover:text-mesa-ember"
                              >
                                {line.name}
                              </Link>
                              {line.themeName ? (
                                <p className="mt-1 text-xs font-medium text-mesa-jade">
                                  Tema: {line.themeName}
                                </p>
                              ) : null}
                              {line.variationSummary ? (
                                <p className="mt-0.5 text-xs text-mesa-ash">
                                  {line.variationSummary}
                                </p>
                              ) : null}
                              {line.requiresUnitUploads && line.uploadsComplete === false ? (
                                <div className="mt-2 rounded-sm border border-amber-500/25 bg-amber-500/10 px-2.5 py-2">
                                  <p className="text-[11px] text-amber-100">
                                    Imagens pendentes ({line.itemUploads?.length ?? 0}/
                                    {line.quantity})
                                  </p>
                                  <Link
                                    href={productHref}
                                    onClick={onClose}
                                    className="home-v2-display mt-1 inline-flex text-[11px] tracking-[0.14em] text-mesa-ember hover:text-[#ff7a4a]"
                                  >
                                    Enviar na página do produto →
                                  </Link>
                                </div>
                              ) : null}
                              <p className="mt-1 text-xs tabular-nums text-mesa-ash">
                                {line.originalPriceCents &&
                                line.originalPriceCents > line.priceCents ? (
                                  <>
                                    <span className="mr-1.5 line-through">
                                      {formatMoney(line.originalPriceCents)}
                                    </span>
                                    <span className="text-mesa-parchment">
                                      {formatMoney(line.priceCents)} cada
                                    </span>
                                  </>
                                ) : (
                                  <>{formatMoney(line.priceCents)} cada</>
                                )}
                              </p>
                            </div>
                            <p className="shrink-0 text-sm font-semibold tabular-nums text-mesa-parchment">
                              {formatMoney(line.lineTotalCents)}
                            </p>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <div className="flex items-center rounded-sm border border-white/15 bg-mesa-stone">
                              <button
                                type="button"
                                aria-label={
                                  line.quantity <= 1
                                    ? `Remover ${line.name}`
                                    : 'Diminuir quantidade'
                                }
                                onClick={() =>
                                  decreaseQuantity(line.lineId, line.quantity)
                                }
                                className="flex size-11 cursor-pointer items-center justify-center text-mesa-ash transition-colors hover:text-mesa-parchment"
                              >
                                {line.quantity <= 1 ? (
                                  <Trash2 className="h-3.5 w-3.5" />
                                ) : (
                                  <Minus className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums text-mesa-parchment">
                                {line.quantity}
                              </span>
                              <button
                                type="button"
                                aria-label="Aumentar quantidade"
                                disabled={line.quantity >= maxQty}
                                onClick={() =>
                                  increaseQuantity(
                                    line.lineId,
                                    line.quantity,
                                    line
                                  )
                                }
                                className="flex size-11 cursor-pointer items-center justify-center text-mesa-ash transition-colors hover:text-mesa-parchment disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(line.lineId)}
                              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 px-1 text-xs text-mesa-ash transition-colors hover:text-red-300"
                              aria-label={`Remover ${line.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remover
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {hydrated && resolved.length > 0 ? (
              <div className="shrink-0 border-t border-white/10 bg-mesa-stone px-5 py-5 pb-safe">
                {validationIssues.length > 0 ? (
                  <div className="mb-4">
                    <CartValidationBanner issues={validationIssues} />
                  </div>
                ) : null}
                <div className="mb-4 flex items-baseline justify-between">
                  <span className="home-v2-display text-[11px] tracking-[0.2em] text-mesa-ash">Subtotal</span>
                  <span className="text-xl font-semibold tabular-nums text-mesa-parchment">
                    {formatMoney(subtotalCents)}
                  </span>
                </div>
                <StoreNavLink
                  href={STORE_ROUTES.checkout}
                  loadingLabel="Abrindo pagamento…"
                  disabled={!cartIsValid}
                  className={homeV2ButtonClassName({ size: 'lg', className: 'mb-2 w-full' })}
                >
                  Finalizar compra
                </StoreNavLink>
                <StoreNavLink
                  href={STORE_ROUTES.cart}
                  loadingLabel="Abrindo carrinho…"
                  className="home-v2-display flex min-h-11 items-center justify-center text-sm tracking-[0.1em] text-mesa-ash transition-colors hover:text-mesa-parchment"
                >
                  Ver carrinho completo
                </StoreNavLink>
              </div>
            ) : null}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
