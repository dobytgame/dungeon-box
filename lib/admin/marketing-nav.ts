export const ADMIN_MARKETING_NAV = [
  { href: '/admin/marketing', label: 'Enviar campanha' },
  { href: '/admin/marketing/leads', label: 'Leads', showCount: true },
  { href: '/admin/marketing/historico', label: 'Histórico de disparos' },
] as const;

export function isAdminMarketingSection(pathname: string): boolean {
  return pathname === '/admin/marketing' || pathname.startsWith('/admin/marketing/');
}

export function isAdminMarketingNavActive(pathname: string, href: string): boolean {
  if (href === '/admin/marketing') {
    return pathname === '/admin/marketing';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
