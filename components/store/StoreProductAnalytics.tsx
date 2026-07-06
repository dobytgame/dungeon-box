'use client';

import { useEffect, useRef } from 'react';
import type { StoreProduct } from '@/lib/store/catalog';
import { trackStoreViewItem } from '@/lib/analytics/store-events';

interface Props {
  product: StoreProduct;
}

export default function StoreProductAnalytics({ product }: Props) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackStoreViewItem(product);
  }, [product]);

  return null;
}
