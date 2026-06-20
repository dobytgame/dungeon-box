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
import {
  cartItemCount,
  cartSubtotalCents,
  normalizeCartLines,
  STORE_CART_STORAGE_KEY,
  type CartLine,
} from '@/lib/store/cart';
import type { StoreProductId } from '@/lib/store/catalog';

type StoreCartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotalCents: number;
  addItem: (productId: StoreProductId, quantity?: number) => void;
  setQuantity: (productId: StoreProductId, quantity: number) => void;
  removeItem: (productId: StoreProductId) => void;
  clearCart: () => void;
  hydrated: boolean;
};

const StoreCartContext = createContext<StoreCartContextValue | null>(null);

function readStoredCart(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORE_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return normalizeCartLines(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

export function StoreCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORE_CART_STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const addItem = useCallback((productId: StoreProductId, quantity = 1) => {
    setLines((current) => {
      const normalized = normalizeCartLines(current);
      const existing = normalized.find((line) => line.productId === productId);
      if (existing) {
        return normalizeCartLines(
          normalized.map((line) =>
            line.productId === productId
              ? { ...line, quantity: line.quantity + quantity }
              : line
          )
        );
      }
      return normalizeCartLines([...normalized, { productId, quantity }]);
    });
  }, []);

  const setQuantity = useCallback((productId: StoreProductId, quantity: number) => {
    setLines((current) =>
      normalizeCartLines(
        current.map((line) =>
          line.productId === productId ? { ...line, quantity } : line
        )
      )
    );
  }, []);

  const removeItem = useCallback((productId: StoreProductId) => {
    setLines((current) =>
      normalizeCartLines(current.filter((line) => line.productId !== productId))
    );
  }, []);

  const clearCart = useCallback(() => {
    setLines([]);
  }, []);

  const value = useMemo(
    () => ({
      lines,
      itemCount: cartItemCount(lines),
      subtotalCents: cartSubtotalCents(lines),
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      hydrated,
    }),
    [lines, addItem, setQuantity, removeItem, clearCart, hydrated]
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
