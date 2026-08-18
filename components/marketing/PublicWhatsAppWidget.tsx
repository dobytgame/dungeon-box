'use client';

import { usePathname } from 'next/navigation';
import FloatingWhatsAppWidget from '@/components/marketing/FloatingWhatsAppWidget';

function isGuildCampaignPath(pathname: string): boolean {
  return (
    pathname === '/entre-para-guilda' || pathname === '/entre-para-guilda-v1'
  );
}

function shouldShowWhatsAppWidget(pathname: string): boolean {
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    return false;
  }

  return (
    pathname === '/' ||
    pathname.startsWith('/loja') ||
    isGuildCampaignPath(pathname)
  );
}

export default function PublicWhatsAppWidget() {
  const pathname = usePathname() ?? '';

  if (!shouldShowWhatsAppWidget(pathname)) {
    return null;
  }

  const source = pathname.startsWith('/loja')
    ? 'floating_widget_loja'
    : pathname === '/entre-para-guilda-v1'
      ? 'floating_widget_guilda_v1'
      : pathname === '/entre-para-guilda'
        ? 'floating_widget_guilda'
        : 'floating_widget_lp';

  return <FloatingWhatsAppWidget source={source} />;
}
