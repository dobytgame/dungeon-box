import { faqItems, plans } from '@/lib/data';
import { launchFaqItems, launchPlans } from '@/lib/launch/data';
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
        '@id': `${siteUrl}/#webpage`,
        url: siteUrl,
        name: `Assinatura de Cenários 3D para RPG | ${SITE_NAME}`,
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: { '@id': `${siteUrl}/#service` },
        inLanguage: 'pt-BR',
        description:
          'Primeira assinatura mensal de cenários 3D modulares do Brasil. Sistema OpenLOCK, escala 28mm. Compatível com D&D, Tormenta, Pathfinder e mais.',
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
        '@id': `${siteUrl}/#faq`,
        mainEntity: launchFaqItems.map((item) => ({
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
        '@id': `${siteUrl}/#planos`,
        name: 'Planos DungeonBox',
        itemListElement: launchPlans.map((plan, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Product',
            name: `Plano ${plan.name}`,
            description: plan.perks.join('. '),
            brand: { '@type': 'Brand', name: SITE_NAME },
            category: 'Cenários 3D modulares para RPG',
            image: absoluteUrl(plan.image),
          },
        })),
      },
    ],
  };
}

export function buildSalesPageJsonLd() {
  const siteUrl = getCanonicalSiteUrl();
  const pageUrl = absoluteUrl('/lp2');
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
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: `Assinatura de Cenários 3D para RPG | ${SITE_NAME}`,
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: { '@id': `${siteUrl}/#service` },
        inLanguage: 'pt-BR',
        description:
          'Assinatura mensal de cenários 3D modulares para RPG. Tiles, paredes e props na sua porta todo mês. Compatível com D&D, Tormenta e Pathfinder.',
      },
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faq`,
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
        '@id': `${pageUrl}#planos`,
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
