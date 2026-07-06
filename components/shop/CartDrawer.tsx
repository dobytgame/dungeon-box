'use client';

import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import { useStoreCatalog } from '@/components/store/StoreCatalogProvider';
import { formatMoney } from '@/lib/dashboard/format';
import { resolveCartLines } from '@/lib/store/cart';
import { STORE_PRODUCT_IMAGE_SIZE } from '@/lib/store/product-media';
import { STORE_ROUTES } from '@/lib/store/routes';
import StoreNavLink from '@/components/shop/StoreNavLink';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const { allProducts } = useStoreCatalog();
  const { lines, subtotalCents, setQuantity, removeItem, hydrated } = useStoreCart();
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
    productId: string,
    currentQuantity: number,
    maxQuantity: number
  ) {
    if (currentQuantity <= 1) {
      removeItem(productId);
      return;
    }
    setQuantity(productId, currentQuantity - 1);
  }

  function increaseQuantity(
    productId: string,
    currentQuantity: number,
    maxQuantity: number
  ) {
    setQuantity(productId, Math.min(maxQuantity, currentQuantity + 1));
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[200]" role="presentation">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 cursor-pointer bg-black/60"
            onClick={onClose}
            aria-label="Fechar carrinho"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="absolute right-0 top-0 grid h-full max-h-[100dvh] w-full max-w-md grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-l border-white/[0.08] bg-[#0A0C10] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Carrinho de compras"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-ember" aria-hidden="true" />
                <h2 className="font-display text-sm uppercase tracking-widest text-white">
                  Carrinho
                  {hydrated && resolved.length > 0 ? (
                    <span className="ml-2 text-stone-500">
                      ({resolved.reduce((sum, line) => sum + line.quantity, 0)})
                    </span>
                  ) : null}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm text-stone-400 hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-2">
              {!hydrated ? (
                <p className="text-sm text-stone-500">Carregando…</p>
              ) : resolved.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-sm bg-white/[0.04]">
                    <ShoppingBag className="h-7 w-7 text-stone-600" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-stone-400">Seu carrinho está vazio.</p>
                  <Link
                    href={STORE_ROUTES.home}
                    onClick={onClose}
                    className="mt-4 inline-flex font-display text-xs uppercase tracking-widest text-ember hover:text-ember-bright"
                  >
                    Ver produtos →
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-white/[0.06]">
                  {resolved.map((line) => {
                    const maxQty = line.maxQuantity ?? 9;
                    const productHref = line.slug
                      ? STORE_ROUTES.product(line.slug)
                      : STORE_ROUTES.home;

                    return (
                      <li key={line.productId} className="flex gap-3 py-4">
                        <Link
                          href={productHref}
                          onClick={onClose}
                          className="relative shrink-0 overflow-hidden rounded-sm bg-stone-900"
                        >
                          {line.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={line.imageUrl}
                              alt=""
                              width={STORE_PRODUCT_IMAGE_SIZE}
                              height={STORE_PRODUCT_IMAGE_SIZE}
                              className="aspect-square h-20 w-20 object-cover transition hover:scale-105"
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

                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <Link
                                href={productHref}
                                onClick={onClose}
                                className="line-clamp-2 font-medium text-white hover:text-ember"
                              >
                                {line.name}
                              </Link>
                              {line.themeName ? (
                                <p className="mt-0.5 text-xs text-gold">
                                  Tema: {line.themeName}
                                </p>
                              ) : null}
                              <p className="mt-1 text-xs text-stone-500">
                                {formatMoney(line.priceCents)} cada
                              </p>
                            </div>
                            <p className="shrink-0 font-display text-sm text-ember">
                              {formatMoney(line.lineTotalCents)}
                            </p>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <div className="flex items-center rounded-sm border border-white/10">
                              <button
                                type="button"
                                aria-label={
                                  line.quantity <= 1
                                    ? `Remover ${line.name}`
                                    : 'Diminuir quantidade'
                                }
                                onClick={() =>
                                  decreaseQuantity(
                                    line.productId,
                                    line.quantity,
                                    maxQty
                                  )
                                }
                                className="flex h-9 w-9 cursor-pointer items-center justify-center text-stone-400 transition hover:text-white"
                              >
                                {line.quantity <= 1 ? (
                                  <Trash2 className="h-3.5 w-3.5" />
                                ) : (
                                  <Minus className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <span className="min-w-[2rem] text-center text-sm text-white">
                                {line.quantity}
                              </span>
                              <button
                                type="button"
                                aria-label="Aumentar quantidade"
                                disabled={line.quantity >= maxQty}
                                onClick={() =>
                                  increaseQuantity(
                                    line.productId,
                                    line.quantity,
                                    maxQty
                                  )
                                }
                                className="flex h-9 w-9 cursor-pointer items-center justify-center text-stone-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(line.productId)}
                              className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-stone-500 transition hover:text-red-300"
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
              <div className="shrink-0 border-t border-white/[0.08] bg-[#0A0C10] px-5 py-4">
                <div className="mb-4 flex justify-between text-sm">
                  <span className="text-stone-500">Subtotal</span>
                  <span className="font-display text-lg text-white">
                    {formatMoney(subtotalCents)}
                  </span>
                </div>
                <StoreNavLink
                  href={STORE_ROUTES.checkout}
                  loadingLabel="Abrindo pagamento…"
                  className="mb-3 flex min-h-[44px] cursor-pointer items-center justify-center rounded-sm bg-ember font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
                >
                  Finalizar compra
                </StoreNavLink>
                <StoreNavLink
                  href={STORE_ROUTES.cart}
                  loadingLabel="Abrindo carrinho…"
                  className="flex min-h-[40px] items-center justify-center font-display text-xs uppercase tracking-widest text-stone-400 hover:text-white"
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
