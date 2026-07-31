'use client';

import { useEffect, useState } from 'react';
import {
  ACTIVE_PAYMENT_PROVIDER,
  type CheckoutProvider,
  isCheckoutProvider,
} from '@/lib/payments/public';

export function useCheckoutProvider(): CheckoutProvider {
  const [provider, setProvider] = useState<CheckoutProvider>(
    ACTIVE_PAYMENT_PROVIDER
  );

  useEffect(() => {
    let cancelled = false;

    void fetch('/api/checkout/provider')
      .then((res) => res.json())
      .then((payload: { provider?: string }) => {
        if (cancelled) return;
        if (payload.provider && isCheckoutProvider(payload.provider)) {
          setProvider(payload.provider);
        }
      })
      .catch(() => {
        // Mantém fallback do env.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return provider;
}
