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
import { useStoreCatalog } from '@/components/store/StoreCatalogProvider';
import {
  cartItemCount,
  cartSubtotalCents,
  normalizeCartLines,
  STORE_CART_STORAGE_KEY,
  type CartLine,
} from '@/lib/store/cart';

type StoreCartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotalCents: number;
  addItem: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
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
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function StoreCartProvider({ children }: { children: ReactNode }) {
  const { allProducts } = useStoreCatalog();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

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

  const addItem = useCallback(
    (productId: string, quantity = 1) => {
      setLines((current) => {
        const normalized = normalizeCartLines(current, allProducts);
        const existing = normalized.find((line) => line.productId === productId);
        if (existing) {
          return normalizeCartLines(
            normalized.map((line) =>
              line.productId === productId
                ? { ...line, quantity: line.quantity + quantity }
                : line
            ),
            allProducts
          );
        }
        return normalizeCartLines(
          [...normalized, { productId, quantity }],
          allProducts
        );
      });
    },
    [allProducts]
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      setLines((current) =>
        normalizeCartLines(
          current.map((line) =>
            line.productId === productId ? { ...line, quantity } : line
          ),
          allProducts
        )
      );
    },
    [allProducts]
  );

  const removeItem = useCallback((productId: string) => {
    setLines((current) =>
      normalizeCartLines(
        current.filter((line) => line.productId !== productId),
        allProducts
      )
    );
  }, [allProducts]);

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
    }),
    [lines, allProducts, addItem, setQuantity, removeItem, clearCart, hydrated]
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
