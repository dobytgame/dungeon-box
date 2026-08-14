export const ADMIN_SALES_NAV = [
  { href: '/admin/vendas', label: 'Resumo' },
  { href: '/admin/vendas/mapa', label: 'Mapa' },
] as const;

export function isAdminSalesSection(pathname: string): boolean {
  return pathname === '/admin/vendas' || pathname.startsWith('/admin/vendas/');
}

export function isAdminSalesNavActive(pathname: string, href: string): boolean {
  if (href === '/admin/vendas') {
    return pathname === '/admin/vendas';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
