'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { useStoreCatalog } from '@/components/store/StoreCatalogProvider';
import {
  cartItemCount,
  cartSubtotalCents,
  normalizeCartLines,
  STORE_CART_STORAGE_KEY,
  type CartLine,
} from '@/lib/store/cart';
import { cartLineId } from '@/lib/store/product-variations';

export type CartAddFeedback = {
  id: number;
  name: string;
  imageUrl?: string;
  priceCents: number;
  quantity: number;
};

type StoreCartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotalCents: number;
  addItem: (
    productId: string,
    quantity?: number,
    feedback?: Omit<CartAddFeedback, 'id'>,
    selectedOptions?: Record<string, string>
  ) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;
  hydrated: boolean;
  cartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  cartBump: number;
  addFeedback: CartAddFeedback | null;
  dismissAddFeedback: () => void;
};

const StoreCartContext = createContext<StoreCartContextValue | null>(null);

function readStoredCart(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORE_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function StoreCartProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { allProducts } = useStoreCatalog();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [cartBump, setCartBump] = useState(0);
  const [addFeedback, setAddFeedback] = useState<CartAddFeedback | null>(null);

  useEffect(() => {
    setCartDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    setLines(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setLines((current) => normalizeCartLines(current, allProducts));
  }, [allProducts, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORE_CART_STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const openCartDrawer = useCallback(() => setCartDrawerOpen(true), []);
  const closeCartDrawer = useCallback(() => setCartDrawerOpen(false), []);
  const dismissAddFeedback = useCallback(() => setAddFeedback(null), []);

  const addItem = useCallback(
    (
      productId: string,
      quantity = 1,
      feedback?: Omit<CartAddFeedback, 'id'>,
      selectedOptions?: Record<string, string>
    ) => {
      setLines((current) => {
        const normalized = normalizeCartLines(current, allProducts);
        const nextLine: CartLine = {
          productId,
          quantity,
          ...(selectedOptions ? { selectedOptions } : {}),
        };
        const lineId = cartLineId(nextLine);
        const existing = normalized.find((line) => cartLineId(line) === lineId);

        if (existing) {
          return normalizeCartLines(
            normalized.map((line) =>
              cartLineId(line) === lineId
                ? { ...line, quantity: line.quantity + quantity }
                : line
            ),
            allProducts
          );
        }

        return normalizeCartLines([...normalized, nextLine], allProducts);
      });

      if (feedback) {
        setAddFeedback({
          id: Date.now(),
          name: feedback.name,
          imageUrl: feedback.imageUrl,
          priceCents: feedback.priceCents,
          quantity: feedback.quantity,
        });
        setCartBump((value) => value + 1);
      }
    },
    [allProducts]
  );

  const setQuantity = useCallback(
    (lineId: string, quantity: number) => {
      setLines((current) =>
        normalizeCartLines(
          current.map((line) =>
            cartLineId(line) === lineId ? { ...line, quantity } : line
          ),
          allProducts
        )
      );
    },
    [allProducts]
  );

  const removeItem = useCallback(
    (lineId: string) => {
      setLines((current) =>
        normalizeCartLines(
          current.filter((line) => cartLineId(line) !== lineId),
          allProducts
        )
      );
    },
    [allProducts]
  );

  const clearCart = useCallback(() => {
    setLines([]);
  }, []);

  const value = useMemo(
    () => ({
      lines,
      itemCount: cartItemCount(lines, allProducts),
      subtotalCents: cartSubtotalCents(lines, allProducts),
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      hydrated,
      cartDrawerOpen,
      openCartDrawer,
      closeCartDrawer,
      cartBump,
      addFeedback,
      dismissAddFeedback,
    }),
    [
      lines,
      allProducts,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      hydrated,
      cartDrawerOpen,
      openCartDrawer,
      closeCartDrawer,
      cartBump,
      addFeedback,
      dismissAddFeedback,
    ]
  );

  return (
    <StoreCartContext.Provider value={value}>{children}</StoreCartContext.Provider>
  );
}

export function useStoreCart(): StoreCartContextValue {
  const context = useContext(StoreCartContext);
  if (!context) {
    throw new Error('useStoreCart must be used within StoreCartProvider');
  }
  return context;
}
