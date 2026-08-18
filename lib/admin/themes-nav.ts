export const ADMIN_THEMES_NAV = [
  { href: '/admin/temas', label: 'Temas mensais' },
  { href: '/admin/temas/votacao', label: 'Votação' },
] as const;

export function isAdminThemesSection(pathname: string): boolean {
  return pathname === '/admin/temas' || pathname.startsWith('/admin/temas/');
}

export function isAdminThemesNavActive(pathname: string, href: string): boolean {
  if (href === '/admin/temas/votacao') {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (href === '/admin/temas') {
    if (pathname === '/admin/temas' || pathname === '/admin/temas/novo') return true;
    return /^\/admin\/temas\/[0-9a-f-]{36}$/i.test(pathname);
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
