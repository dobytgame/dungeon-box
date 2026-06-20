'use client';

import { useEffect, useRef } from 'react';
import type { PlanSlug } from '@/lib/checkout/plans';
import {
  buildPlanSlugsEcommerceItems,
  sumEcommerceItemsValue,
} from '@/lib/analytics/checkout-items';
import { trackBeginCheckoutEntry } from '@/lib/analytics/data-layer';

interface Props {
  planSlugs: PlanSlug[];
}

export default function CheckoutPageAnalytics({ planSlugs }: Props) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current || planSlugs.length === 0) return;
    tracked.current = true;

    const items = buildPlanSlugsEcommerceItems(planSlugs);
    trackBeginCheckoutEntry({
      items,
      value: sumEcommerceItemsValue(items),
    });
  }, [planSlugs]);

  return null;
}
