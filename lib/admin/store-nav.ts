export const ADMIN_STORE_NAV = [
  { href: '/admin/loja', label: 'Produtos' },
  { href: '/admin/loja/pedidos', label: 'Pedidos' },
  { href: '/admin/loja/temas', label: 'Temas dos kits' },
  { href: '/admin/loja/categorias', label: 'Categorias' },
  { href: '/admin/loja/banners', label: 'Banners' },
] as const;

export function isAdminStoreNavActive(pathname: string, href: string): boolean {
  if (href === '/admin/loja/pedidos' || href === '/admin/loja/temas') {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (href === '/admin/loja') {
    if (pathname === '/admin/loja' || pathname === '/admin/loja/novo') return true;
    return /^\/admin\/loja\/[0-9a-f-]{36}$/i.test(pathname);
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isAdminStoreSection(pathname: string): boolean {
  return pathname === '/admin/loja' || pathname.startsWith('/admin/loja/');
}
