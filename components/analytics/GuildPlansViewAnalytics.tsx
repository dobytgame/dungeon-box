'use client';

import { useEffect, useRef } from 'react';
import { pushDataLayer } from '@/lib/analytics/data-layer';
import { GUILD_LP_PAGE_VARIANT } from '@/lib/guild-lp/analytics';

interface Props {
  targetId?: string;
}

/** Dispara plans_view quando a seção de planos entra no viewport. */
export default function GuildPlansViewAnalytics({ targetId = 'planos' }: Props) {
  const tracked = useRef(false);

  useEffect(() => {
    const node = document.getElementById(targetId);
    if (!node || tracked.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (!visible || tracked.current) return;
        tracked.current = true;
        pushDataLayer({
          event: 'plans_view',
          page_path: '/entre-para-guilda',
          page_variant: GUILD_LP_PAGE_VARIANT,
        });
        observer.disconnect();
      },
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [targetId]);

  return null;
}
