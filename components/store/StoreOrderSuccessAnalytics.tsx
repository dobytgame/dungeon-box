'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { trackPurchase } from '@/lib/analytics/data-layer';
import { trackMetaPurchase } from '@/lib/analytics/meta-pixel';
import {
  hasTrackedStorePurchase,
  markStorePurchaseTracked,
  type StoreOrderPurchaseAnalytics,
} from '@/lib/analytics/store-purchase';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const POLL_MS = 2000;
const MAX_ATTEMPTS = 30;

function trackStoreOrderPurchase(order: StoreOrderPurchaseAnalytics): void {
  if (hasTrackedStorePurchase(order.transactionId)) return;

  trackPurchase({
    transactionId: order.transactionId,
    value: order.value,
    items: order.items,
  });

  trackMetaPurchase({
    value: order.value,
    contentName: order.contentName,
  });

  markStorePurchaseTracked(order.transactionId);
}

export default function StoreOrderSuccessAnalytics() {
  const searchParams = useSearchParams();
  const orderId = useMemo(() => {
    const raw = searchParams.get('order')?.trim() ?? '';
    return UUID_RE.test(raw) ? raw : '';
  }, [searchParams]);

  const trackedRef = useRef(false);

  useEffect(() => {
    if (!orderId || trackedRef.current) return;

    if (hasTrackedStorePurchase(orderId)) {
      trackedRef.current = true;
      return;
    }

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      while (!cancelled && attempts < MAX_ATTEMPTS && !trackedRef.current) {
        attempts += 1;

        try {
          const res = await fetch(
            `/api/store/checkout/status?orderId=${encodeURIComponent(orderId)}`,
            { cache: 'no-store' }
          );
          const payload = await res.json().catch(() => ({}));

          if (cancelled || trackedRef.current) return;

          if (res.ok && payload.state === 'approved' && payload.order) {
            trackedRef.current = true;
            trackStoreOrderPurchase(payload.order as StoreOrderPurchaseAnalytics);
            return;
          }

          if (res.ok && payload.state === 'approved') {
            trackedRef.current = true;
            return;
          }
        } catch {
          // retry
        }

        await new Promise((resolve) => window.setTimeout(resolve, POLL_MS));
      }
    }

    void poll();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return null;
}
