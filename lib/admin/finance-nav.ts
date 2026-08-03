export const ADMIN_FINANCE_NAV = [
  { href: '/admin/financeiro', label: 'Fluxo' },
  { href: '/admin/financeiro/gastos', label: 'Gastos' },
  { href: '/admin/financeiro/gateway', label: 'Gateway' },
  { href: '/admin/financeiro/assinantes', label: 'Assinantes' },
  { href: '/admin/pagamentos', label: 'Pagamentos' },
] as const;

export function isAdminFinanceSection(pathname: string): boolean {
  return (
    pathname === '/admin/financeiro' ||
    pathname.startsWith('/admin/financeiro/') ||
    pathname === '/admin/pagamentos' ||
    pathname.startsWith('/admin/pagamentos/')
  );
}

export function isAdminFinanceNavActive(
  pathname: string,
  href: string
): boolean {
  if (href === '/admin/financeiro') {
    return pathname === '/admin/financeiro';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
