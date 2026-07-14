'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ShoppingBag, X } from 'lucide-react';
import { useEffect } from 'react';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import { formatMoney } from '@/lib/dashboard/format';
import { STORE_PRODUCT_IMAGE_SIZE } from '@/lib/store/product-media';
import { STORE_ROUTES } from '@/lib/store/routes';
import StoreNavLink from '@/components/shop/StoreNavLink';

const AUTO_DISMISS_MS = 5500;

export default function CartAddedToast() {
  const { addFeedback, dismissAddFeedback, openCartDrawer, itemCount } =
    useStoreCart();

  useEffect(() => {
    if (!addFeedback) return;
    const timer = window.setTimeout(dismissAddFeedback, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [addFeedback, dismissAddFeedback]);

  return (
    <AnimatePresence>
      {addFeedback ? (
        <motion.div
          key={addFeedback.id}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className="pointer-events-auto fixed bottom-safe-offset left-4 right-4 z-[100] mx-auto max-w-md sm:left-auto sm:right-6"
        >
          <div className="overflow-hidden rounded-sm border border-ember/30 bg-[#0A0C10]/95 shadow-[0_20px_60px_-12px_rgba(249,115,22,0.35)] backdrop-blur-md">
            <div className="flex items-start gap-3 p-4">
              <div className="relative shrink-0">
                {addFeedback.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={addFeedback.imageUrl}
                    alt=""
                    width={STORE_PRODUCT_IMAGE_SIZE}
                    height={STORE_PRODUCT_IMAGE_SIZE}
                    className="aspect-square h-14 w-14 rounded-sm object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-sm bg-ember/15">
                    <ShoppingBag className="h-6 w-6 text-ember" aria-hidden="true" />
                  </div>
                )}
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ember text-[10px] font-bold text-stone-950">
                  {addFeedback.quantity}
                </span>
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <p className="flex items-center gap-1.5 font-display text-[10px] uppercase tracking-[0.2em] text-ember">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Adicionado ao carrinho
                </p>
                <p className="mt-1 truncate font-medium text-white">
                  {addFeedback.name}
                </p>
                <p className="mt-0.5 text-xs text-stone-400">
                  {addFeedback.quantity > 1
                    ? `${addFeedback.quantity} unidades · `
                    : ''}
                  {formatMoney(addFeedback.priceCents * addFeedback.quantity)}
                  {itemCount > 0 ? ` · ${itemCount} no carrinho` : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={dismissAddFeedback}
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-sm text-stone-500 transition hover:bg-white/5 hover:text-white"
                aria-label="Fechar aviso"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => {
                  dismissAddFeedback();
                  openCartDrawer();
                }}
                className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 bg-ember font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                Ver carrinho
              </button>
              <StoreNavLink
                href={STORE_ROUTES.checkout}
                loadingLabel="Abrindo pagamento…"
                onNavigate={dismissAddFeedback}
                className="flex min-h-[44px] flex-1 items-center justify-center border-l border-white/[0.08] font-display text-xs uppercase tracking-widest text-stone-300 transition hover:bg-white/5 hover:text-white"
              >
                Finalizar
              </StoreNavLink>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
