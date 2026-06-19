'use client';

import { useEffect, useRef } from 'react';
import { plans } from '@/lib/data';
import { trackViewItemList } from '@/lib/analytics/data-layer';

export default function LandingPageAnalytics() {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    trackViewItemList(
      plans.map((plan) => ({
        item_id: plan.id,
        item_name: `Plano ${plan.name}`,
        price: plan.price,
      }))
    );
  }, []);

  return null;
}
