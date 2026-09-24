import { checkoutHref, type PlanSlug } from '@/lib/checkout/plans';
import { faqItems, plans, planSupportCopy } from '@/lib/data';
export const HOME_V2_VARIANT = 'home-v2';

export type HomeV2Plan = {
  slug: PlanSlug;
  name: string;
  tagline: string;
  monthlyPriceCents: number;
  badge?: string;
  metrics: Array<{ label: string; value: string }>;
  gallery: Array<{ src: string; alt: string }>;
  checkoutUrl: string;
  details: {
    quantities: string;
    pieces: string[];
    comparison?: string;
    conditions: string[];
    production: string;
  };
};

export type HomeV2StoreProduct = {
  sku: string;
  name: string;
  category?: string;
  priceCents: number;
  priceLabel: string;
  image?: { src: string; alt: string };
  productUrl: string;
  compatibleWithSubscription: boolean;
};

export type HomeV2MonthlyDungeon = {
  title: string;
  lore: string;
  status: 'revealed' | 'coming_soon';
  heroMedia?: { src: string; alt: string };
  detailMedia?: { src: string; alt: string };
  highlights: string[];
};

export type HomeV2Testimonial = {
  id: string;
  quote: string;
  name: string;
  context?: string;
  rating: number;
  imageUrls: string[];
};

const STARTING_PRICE_LABEL = `R$${Math.min(...plans.map((plan) => plan.price))}`;

export const HOME_V2_COPY = {
  headerCta: 'Começar assinatura',
  startingPrice: `A partir de ${STARTING_PRICE_LABEL}/mês`,
  hero: {
    eyebrow: 'Assinatura mensal · Cenários 3D modulares',
    title: 'Sua próxima sessão começa aqui.',
    support:
      'Receba novos cenários 3D todos os meses e transforme cada campanha em uma mesa que seus jogadores vão lembrar.',
    cta: 'Escolher meu plano',
    secondaryCta: 'Ver como funciona',
    guarantees: ['Cancele quando quiser', 'Sem carência', 'Peças que se conectam'],
  },
  evidenceSection: {
    eyebrow: 'O sistema por trás da aventura',
    title: 'Uma dungeon que cresce junto com a sua campanha.',
    support:
      'Cada caixa começa com uma mesa jogável e continua adicionando possibilidades que se conectam.',
  },
  evidence: [
    {
      label: 'Peças modulares',
      detail: 'Monte, desmonte e remonte cada sala para a próxima sessão.',
    },
    {
      label: 'Sistema OpenLOCK',
      detail: 'Um encaixe simples para expandir a dungeon sem limite.',
    },
    {
      label: 'Escala 28 mm',
      detail: 'Proporção feita para miniaturas e encontros memoráveis.',
    },
    {
      label: 'Cancele quando quiser',
      detail: 'Você escolhe o ritmo da sua campanha, sem carência.',
    },
  ] as const,
  journey: {
    eyebrow: 'A jornada da assinatura',
    title: 'Uma caixa começa a aventura. Todas as outras expandem o mundo.',
    caption: 'Todas as peças se conectam. Nada fica para trás.',
    cta: 'Começar pelo Mês 1',
    panels: [
      {
        month: 'Mês 1',
        copy: 'Sua primeira sala.',
        image: {
          src: '/images/aventureiro-1.png',
          alt: 'Kit inicial montado: primeira sala de dungeon na mesa',
        },
      },
      {
        month: 'Mês 3',
        copy: 'Sua dungeon ganha vida.',
        image: {
          src: '/images/heroi-1.png',
          alt: 'Expansão da dungeon com corredores e decoração',
        },
      },
      {
        month: 'Mês 12',
        copy: 'Uma campanha inteira na mesa.',
        image: {
          src: '/images/lendario-1.png',
          alt: 'Cenário amplo montado em sessão real de RPG',
        },
      },
    ] as const,
  },
  plans: {
    eyebrow: 'Encontre o seu começo',
    title: 'Escolha o tamanho da sua aventura.',
    support: 'Todos os planos usam o mesmo encaixe. Comece pequeno e expanda quando quiser.',
    footerLead: 'Não sabe qual escolher?',
    switcherLabel: 'Escolha um plano para ver os detalhes',
    footer: 'Comece pelo Aventureiro. Você pode fazer upgrade depois.',
    billing: 'Cobrança mensal · Cancele quando quiser',
    reassurance: ['Checkout seguro', 'Sem carência e sem multa', 'Upgrade a qualquer momento'],
  },
  monthly: {
    eyebrow: 'Chegando à sua mesa',
    title: 'A próxima aventura já está tomando forma.',
    cta: 'Ver o que vem na próxima caixa',
    comingSoonLore:
      'O tema da próxima caixa é revelado pela operação. Enquanto isso, cada mês continua expandindo a mesma dungeon.',
    fallbackTitle: 'Dungeon do mês',
    highlightsRevealed: [
      'Tema confirmado pela operação',
      'Peças novas no sistema OpenLOCK',
      'Encaixa com todos os kits anteriores',
    ],
    highlightsSoon: [
      'Tema revelado quando a operação confirmar',
      'Mesmo sistema de encaixe de sempre',
      'Sua coleção continua crescendo',
    ],
  },
  store: {
    eyebrow: 'Já quer jogar?',
    title: 'Comece a aventura do seu jeito.',
    text: 'Explore cenários avulsos e expansões para levar mais possibilidades à sua mesa hoje.',
    productCta: 'Ver produto',
    exploreCta: 'Explorar a loja',
    compatibleBadge: 'Compatível com DungeonBox',
  },
  social: {
    eyebrow: 'Mesas reais. Histórias reais.',
    title: 'A campanha já começou por aqui.',
    ratingLabel: 'avaliações de assinantes',
    readMore: 'Ler avaliação completa',
    viewAll: 'Ver todas as avaliações',
  },
  faq: {
    eyebrow: 'Antes de rolar os dados',
    title: 'Dúvidas antes de começar?',
    support:
      'Tudo o que você precisa saber antes de assinar — encaixe, entrega, cancelamento e compatibilidade.',
    contactLead: 'Não encontrou sua resposta?',
    contactCta: 'Falar no WhatsApp',
    cancelNote: 'Pode cancelar quando quiser — sem carência, sem multa.',
  },
  finalCta: {
    eyebrow: 'Sua mesa está esperando',
    title: 'Sua dungeon cresce com a sua campanha.',
    cta: 'Começar minha assinatura',
    support: `${STARTING_PRICE_LABEL}/mês no Aventureiro · Sem carência · Sem multa`,
  },
  footer: {
    tagline:
      'Cenários 3D modulares para RPG. Uma dungeon nova na sua porta, todo mês — impressão premium, escala 28mm, sistema de encaixe universal.',
    cta: 'Assinar agora',
    priceNote: `Kits mensais a partir de ${STARTING_PRICE_LABEL}`,
    specs: ['Escala 28mm', 'Encaixe OpenLOCK', 'Cancele quando quiser'],
    closing: 'Feito para mesas de RPG em todo o Brasil.',
  },
} as const;

const PLAN_TAGLINES: Record<PlanSlug, string> = {
  aventureiro: 'Sua primeira dungeon, pronta para começar.',
  heroi: 'Uma cena completa desde a primeira caixa.',
  lendario: 'Mais escala, mais detalhes, mais história.',
};

const PLAN_CTAS: Record<PlanSlug, string> = {
  aventureiro: 'Escolher Aventureiro',
  heroi: 'Escolher Herói',
  lendario: 'Escolher Lendário',
};

const PLAN_METRICS: Record<
  PlanSlug,
  Array<{ label: string; value: string }>
> = {
  aventureiro: [
    { label: 'Peças', value: '~60' },
    { label: 'Mesa', value: '40×40 cm' },
    { label: 'Sessão', value: '1–2 h' },
  ],
  heroi: [
    { label: 'Peças', value: '~93' },
    { label: 'Mesa', value: '50×60 cm' },
    { label: 'Sessão', value: '3–4 h' },
  ],
  lendario: [
    { label: 'Peças', value: '~132' },
    { label: 'Mesa', value: '70×80 cm' },
    { label: 'Sessão', value: 'Campanha' },
  ],
};

export function getHomeV2Plans(): HomeV2Plan[] {
  return plans.map((plan) => {
    const slug = plan.id as PlanSlug;
    return {
      slug,
      name: plan.name,
      tagline: PLAN_TAGLINES[slug],
      monthlyPriceCents: plan.price * 100,
      badge: slug === 'lendario' ? 'Mais comprado' : undefined,
      metrics: PLAN_METRICS[slug],
      gallery: plan.images.map((src, index) => ({
        src,
        alt: `Kit ${plan.name} montado na mesa — foto ${index + 1} de ${plan.images.length}`,
      })),
      checkoutUrl: checkoutHref(slug),
      details: {
        quantities: plan.pieces,
        pieces: [...plan.deliveryItems],
        comparison: plan.differentiator,
        conditions: [
          plan.billingNote,
          plan.freight,
          planSupportCopy.piecesEstimateNote,
        ],
        production: planSupportCopy.productionNote,
      },
    };
  });
}

export function getHomeV2PlanCta(slug: PlanSlug): string {
  return PLAN_CTAS[slug];
}

export const HOME_V2_FAQ = faqItems;

export function formatHomeV2Price(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}
