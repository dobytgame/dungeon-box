import { getSiteUrl } from '@/lib/email/config';

export const SITE_NAME = 'DungeonBox';

export const SITE_TAGLINE =
  'Assinatura mensal de cenários 3D modulares para RPG';

export const DEFAULT_OG_IMAGE = '/images/img-hero-dungeonbox.png';

export const FAVICON_PATH = '/images/favicon-dungeon.png';

export const SEO_KEYWORDS = [
  'cenários 3D RPG',
  'dungeon tiles',
  'assinatura RPG',
  'cenário D&D',
  'Tormenta RPG cenário',
  'Pathfinder cenário 3D',
  'OpenLOCK',
  'tiles modulares 28mm',
  'cenário impressão 3D',
  'mesa de RPG',
  'dungeon box',
  'cenário modular Brasil',
] as const;

export function getCanonicalSiteUrl(): string {
  return getSiteUrl().replace(/\/$/, '');
}

export function absoluteUrl(path: string): string {
  const base = getCanonicalSiteUrl();
  if (path.startsWith('http')) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function shouldIndexSite(): boolean {
  if (process.env.VERCEL_ENV === 'preview') return false;
  const url = getCanonicalSiteUrl();
  return !url.includes('localhost') && !url.includes('127.0.0.1');
}

export const INDEXABLE_ROUTES = ['/', '/privacidade', '/termos'] as const;
