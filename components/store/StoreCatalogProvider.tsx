'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { STORE_PRODUCTS, type StoreProduct } from '@/lib/store/catalog';

type StoreCatalogContextValue = {
  monthlyKits: StoreProduct[];
  allProducts: StoreProduct[];
  getProduct: (productId: string) => StoreProduct | undefined;
};

const StoreCatalogContext = createContext<StoreCatalogContextValue | null>(null);

export function StoreCatalogProvider({
  monthlyKits,
  children,
}: {
  monthlyKits: StoreProduct[];
  children: ReactNode;
}) {
  const value = useMemo(() => {
    const allProducts = [...monthlyKits, ...STORE_PRODUCTS];
    const byId = new Map(allProducts.map((product) => [product.id, product]));

    return {
      monthlyKits,
      allProducts,
      getProduct: (productId: string) => byId.get(productId),
    };
  }, [monthlyKits]);

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
