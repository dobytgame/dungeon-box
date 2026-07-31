'use client';

import { useEffect, useState } from 'react';
import {
  type CheckoutProvider,
  isCheckoutProvider,
} from '@/lib/payments/public';

export type CheckoutProviderState = {
  provider: CheckoutProvider | null;
  loaded: boolean;
};

export function useCheckoutProvider(): CheckoutProviderState {
  const [state, setState] = useState<CheckoutProviderState>({
    provider: null,
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;

    void fetch(`/api/checkout/provider?_=${Date.now()}`, {
      cache: 'no-store',
    })
      .then((res) => res.json())
      .then((payload: { provider?: string | null }) => {
        if (cancelled) return;
        const next =
          payload.provider && isCheckoutProvider(payload.provider)
            ? payload.provider
            : null;
        setState({ provider: next, loaded: true });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ provider: null, loaded: true });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
