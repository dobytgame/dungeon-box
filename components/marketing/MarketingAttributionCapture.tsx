'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { captureMarketingAttributionFromSearch } from '@/lib/marketing/utm-session';

/** Persiste UTM/fbclid da URL na sessão para checkout e relatório Meta. */
export default function MarketingAttributionCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    captureMarketingAttributionFromSearch(
      query ? `?${query}` : '',
      pathname ?? '/'
    );
  }, [pathname, searchParams]);

  return null;
}
