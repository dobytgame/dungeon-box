'use client';

import { useEffect, useRef } from 'react';
import { pushDataLayer } from '@/lib/analytics/data-layer';
import { GUILD_LP_PAGE_VARIANT } from '@/lib/guild-lp/analytics';

export default function GuildLpPageAnalytics() {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    const device =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
        ? 'mobile'
        : 'desktop';

    pushDataLayer({
      event: 'landing_view',
      page_path: '/entre-para-guilda',
      page_variant: GUILD_LP_PAGE_VARIANT,
      dispositivo: device,
    });
  }, []);

  return null;
}
