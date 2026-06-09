import type { Metadata } from 'next';
import {
  DEFAULT_OG_IMAGE,
  SEO_KEYWORDS,
  SITE_NAME,
  absoluteUrl,
  getCanonicalSiteUrl,
  shouldIndexSite,
} from '@/lib/seo/site';

const NOINDEX_ROBOTS: Metadata['robots'] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

const INDEX_ROBOTS: Metadata['robots'] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
};

export function buildRobots(index: boolean): Metadata['robots'] {
  if (!shouldIndexSite() || !index) return NOINDEX_ROBOTS;
  return INDEX_ROBOTS;
}

export function buildOpenGraph({
  title,
  description,
  path = '/',
  type = 'website',
}: {
  title: string;
  description: string;
  path?: string;
  type?: 'website' | 'article';
}): Metadata['openGraph'] {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    url,
    siteName: SITE_NAME,
    locale: 'pt_BR',
    type,
    images: [
      {
        url: absoluteUrl(DEFAULT_OG_IMAGE),
        width: 2528,
        height: 1686,
        alt: 'Mesa de RPG com caixa DungeonBox, cenários 3D modulares, dados e miniaturas',
      },
    ],
  };
}

export function buildTwitterCard({
  title,
  description,
}: {
  title: string;
  description: string;
}): Metadata['twitter'] {
  return {
    card: 'summary_large_image',
    title,
    description,
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  };
}

export const homePageMetadata: Metadata = {
  title: {
    absolute:
      'Assinatura de Cenários 3D para RPG | DungeonBox — D&D, Tormenta, Pathfinder',
  },
  description:
    'Assinatura mensal de cenários 3D modulares para RPG no Brasil. Sistema OpenLOCK, escala 28mm. Tiles, paredes e props na sua porta todo mês. Entre na lista de fundadores.',
  keywords: [...SEO_KEYWORDS],
  alternates: {
    canonical: getCanonicalSiteUrl(),
  },
  robots: buildRobots(true),
  openGraph: buildOpenGraph({
    title: 'DungeonBox — Cenários 3D Modulares para RPG Todo Mês',
    description:
      'A primeira assinatura mensal de cenários 3D modulares do Brasil. OpenLOCK, 28mm, compatível com D&D, Tormenta e Pathfinder. Vagas de fundador abertas.',
    path: '/',
  }),
  twitter: buildTwitterCard({
    title: 'DungeonBox — Cenários 3D para RPG na sua porta',
    description:
      'Assinatura mensal de dungeon tiles modulares. Sua dungeon cresce a cada caixa. Entre antes do lançamento.',
  }),
  category: 'games',
};

export function privatePageMetadata(title: string): Metadata {
  return {
    title,
    robots: buildRobots(false),
  };
}
