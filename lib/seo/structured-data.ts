import { faqItems, plans } from '@/lib/data';
import {
  DEFAULT_OG_IMAGE,
  FAVICON_PATH,
  SITE_NAME,
  SITE_TAGLINE,
  absoluteUrl,
  getCanonicalSiteUrl,
} from '@/lib/seo/site';

export function buildHomeJsonLd() {
  const siteUrl = getCanonicalSiteUrl();
  const pageUrl = siteUrl;
  const logoUrl = absoluteUrl(FAVICON_PATH);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: SITE_NAME,
        url: siteUrl,
        logo: {
          '@type': 'ImageObject',
          url: logoUrl,
        },
        description: SITE_TAGLINE,
        areaServed: {
          '@type': 'Country',
          name: 'Brasil',
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: SITE_NAME,
        description: SITE_TAGLINE,
        inLanguage: 'pt-BR',
        publisher: { '@id': `${siteUrl}/#organization` },
      },
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}/#webpage`,
        url: pageUrl,
        name: `Assinatura de Cenários 3D para RPG | ${SITE_NAME}`,
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: { '@id': `${siteUrl}/#service` },
        inLanguage: 'pt-BR',
        description:
          'Assinatura mensal de cenários 3D modulares para RPG. Tiles, paredes e props na sua porta todo mês. Compatível com D&D, Tormenta e Pathfinder.',
      },
      {
        '@type': 'Service',
        '@id': `${siteUrl}/#service`,
        name: `${SITE_NAME} — Assinatura Mensal`,
        serviceType: 'Assinatura de cenários 3D modulares para RPG',
        description:
          'Kits mensais com tiles, paredes e props em escala 28mm. Sistema OpenLOCK. Cada caixa expande a dungeon anterior.',
        provider: { '@id': `${siteUrl}/#organization` },
        areaServed: {
          '@type': 'Country',
          name: 'Brasil',
        },
        audience: {
          '@type': 'Audience',
          audienceType: 'Mestres e jogadores de RPG de mesa',
        },
        image: absoluteUrl(DEFAULT_OG_IMAGE),
      },
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}/#faq`,
        mainEntity: faqItems.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}/#planos`,
        name: 'Planos DungeonBox',
        itemListElement: plans.map((plan, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Product',
            name: `Plano ${plan.name}`,
            description: plan.tagline,
            brand: { '@type': 'Brand', name: SITE_NAME },
            category: 'Cenários 3D modulares para RPG',
            image: absoluteUrl(plan.image),
            offers: {
              '@type': 'Offer',
              price: plan.price,
              priceCurrency: 'BRL',
              availability: 'https://schema.org/InStock',
            },
          },
        })),
      },
    ],
  };
}

/** @deprecated Use buildHomeJsonLd — LP de vendas migrou para `/`. */
export const buildSalesPageJsonLd = buildHomeJsonLd;

export function buildStoreProductJsonLd(product: {
  name: string;
  slug: string;
  tagline: string;
  priceCents: number;
  imageUrl?: string;
  galleryUrls?: string[];
}) {
  const siteUrl = getCanonicalSiteUrl();
  const productUrl = `${siteUrl}/loja/produto/${product.slug}`;
  const images = [
    ...(product.imageUrl ? [product.imageUrl] : []),
    ...(product.galleryUrls ?? []),
  ].filter((url, index, list) => list.indexOf(url) === index);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.tagline,
    image: images.length > 0 ? images : undefined,
    url: productUrl,
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
    },
    offers: {
      '@type': 'Offer',
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      url: productUrl,
    },
  };
}
