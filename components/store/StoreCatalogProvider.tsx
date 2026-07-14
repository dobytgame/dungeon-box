'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { StoreProduct } from '@/lib/store/catalog';

type StoreCatalogContextValue = {
  monthlyKits: StoreProduct[];
  allProducts: StoreProduct[];
  getProduct: (productId: string) => StoreProduct | undefined;
};

const StoreCatalogContext = createContext<StoreCatalogContextValue | null>(null);

export function StoreCatalogProvider({
  monthlyKits,
  catalogProducts,
  children,
}: {
  monthlyKits: StoreProduct[];
  catalogProducts: StoreProduct[];
  children: ReactNode;
}) {
  const value = useMemo(() => {
    const byId = new Map<string, StoreProduct>();

    for (const product of catalogProducts) {
      byId.set(product.id, product);
    }
    for (const product of monthlyKits) {
      byId.set(product.id, product);
    }

    const allProducts = Array.from(byId.values());

    return {
      monthlyKits,
      allProducts,
      getProduct: (productId: string) => byId.get(productId),
    };
  }, [monthlyKits, catalogProducts]);

  return (
    <StoreCatalogContext.Provider value={value}>
      {children}
    </StoreCatalogContext.Provider>
  );
}

export function useStoreCatalog(): StoreCatalogContextValue {
  const context = useContext(StoreCatalogContext);
  if (!context) {
    throw new Error('useStoreCatalog must be used within StoreCatalogProvider');
  }
  return context;
}
