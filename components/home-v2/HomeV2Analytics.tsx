'use client';

import { useEffect } from 'react';
import { trackHomeV2View } from '@/lib/home-v2/analytics';

export default function HomeV2Analytics() {
  useEffect(() => {
    const device = window.matchMedia('(max-width: 767px)').matches
      ? 'mobile'
      : 'desktop';
    trackHomeV2View(device);
  }, []);

  return null;
}
