import { SUBSCRIPTION_DELIVERY_FAQ_ANSWER } from '@/lib/production/lead-time';

export const guildLpCopy = {
  heroEyebrow: 'Assinatura mensal de cenários 3D',
  heroHeadline: ['Sua dungeon', 'nunca mais', 'vai parecer amadora.'],
  heroSub:
    'A primeira assinatura mensal de cenários 3D modulares do Brasil. Todo mês um kit novo na sua porta — tiles, paredes, props. Sua dungeon cresce a cada caixa. Para sempre.',
  heroCta: 'Entrar na Guilda — é gratuito',
  heroSupport: 'Grupo exclusivo no WhatsApp · Bastidores da produção · Sem compromisso',
  systems: ['D&D', 'Tormenta', 'Pathfinder'] as const,
  openlock: 'Sistema OpenLOCK',

  proofLabel: 'Quem já montou',
  featuredQuote: {
    text: 'Quando vi o sistema OpenLOCK encaixando as peças do mês 1 com as do mês 2, entendi que isso é diferente de tudo que já comprei para mesa. Não é só um produto — é uma dungeon que cresce junto com a campanha.',
    author: 'Rafael M.',
    meta: 'São Paulo  ·  Mestre de D&D há 7 anos',
  },
  compactQuotes: [
    {
      text: 'Joguei Tormenta por 4 anos sem cenário físico. O kit do Mês 1 já monta 3 a 4 salas. Finalmente é possível ter imersão visual.',
      author: 'Lucas T.',
      meta: 'Rio de Janeiro',
    },
    {
      text: 'Cada sala nova sempre custava R$ 200 avulso. A assinatura resolve isso: a dungeon cresce todo mês, no ritmo da campanha.',
      author: 'Ana P.',
      meta: 'Belo Horizonte',
    },
  ],

  idEyebrow: 'Identificação',
  idHeadline: 'Você conhece essa cena.',
  idBody: [
    'A mesa está montada. Os dados estão prontos. Mas o cenário é um mapa de papel amassado, duas caixas de papelão fazendo de parede e um punhado de improviso.',
    'Você imaginou a dungeon perfeita. O que chegou na mesa não tem nem metade da atmosfera.',
    'Seus jogadores merecem mais. Sua campanha merece mais.',
  ],
  idClose: 'É exatamente isso que a DungeonBox resolve.',

  productEyebrow: 'Na mesa',
  productHeadline: 'Ver para crer.',
  productSub: 'Cenários reais. Na mesa de mestres reais.',

  howEyebrow: 'O modelo',
  howHeadline: 'Simples assim.',
  steps: [
    {
      n: '01',
      title: 'Todo mês',
      body: 'Um kit temático sai da nossa produção e vai direto para a sua porta. Tiles, paredes, props. Tudo impresso em PLA premium.',
    },
    {
      n: '02',
      title: 'Encaixa sempre',
      body: 'Sistema OpenLOCK — o padrão mais usado do mundo. Peças do Mês 1 encaixam no Mês 12. Sua dungeon nunca para de crescer.',
    },
    {
      n: '03',
      title: 'Sua escolha',
      body: 'Três planos. Você começa com o que cabe no bolso e evolui quando quiser. Sem carência. Cancele a qualquer momento.',
    },
    {
      n: '04',
      title: 'Sua dungeon',
      body: 'Mês a mês, sessão a sessão, sua mesa vira o cenário que você sempre imaginou. Seu grupo nunca mais vai jogar no papel.',
    },
  ],

  midHeadline: 'Pronto para entrar?',
  midSub: 'A Guilda é gratuita. É lá que acontece tudo antes do público geral.',
  midCta: 'Entrar na Guilda',
  midSupport: 'Abre o WhatsApp direto · Sem cadastro · Saia quando quiser',

  benefitsEyebrow: 'A Guilda',
  benefitsHeadline: ['O que acontece', 'quando você entra.'],
  benefits: [
    {
      title: 'Bastidores ao vivo',
      body: 'Você acompanha cada kit saindo da impressora antes de todo mundo. Vídeos, fotos e o processo completo em tempo real.',
    },
    {
      title: 'Vote no próximo tema',
      body: 'Membros da Guilda votam nos temas dos próximos kits. Sua dungeon, sua escolha.',
    },
    {
      title: 'Acesso antecipado',
      body: 'O link de assinatura chega na Guilda antes de abrir para o público. Quem está aqui garante primeiro.',
    },
    {
      title: 'Condições exclusivas',
      body: 'Códigos de desconto e ofertas especiais só para membros. Nunca disponíveis fora do grupo.',
    },
  ],
  benefitsFoot: 'Gratuito · Sem spam · Saia quando quiser',

  plansEyebrow: 'Planos',
  plansHeadline: 'A partir de R$ 89/mês.',
  plansSub: 'Três planos. Você escolhe dentro da Guilda, com ajuda de quem já assina.',
  plansNote: '+ frete calculado por CEP · Sem carência · Cancele quando quiser',
  plans: [
    {
      id: 'aventureiro',
      name: 'Aventureiro',
      price: 89,
      tagline: 'Sua primeira dungeon. Funcional no dia 1.',
      detail: '~60 peças · 3–4 salas',
      featured: false,
    },
    {
      id: 'heroi',
      name: 'Herói',
      price: 139,
      tagline: 'A dungeon do mestre. Com atmosfera desde o kit 1.',
      detail: '~93 peças · 5–7 salas',
      featured: false,
    },
    {
      id: 'lendario',
      name: 'Lendário',
      price: 199,
      tagline: 'A experiência épica completa.',
      detail: '~132 peças + 3 miniaturas exclusivas',
      featured: true,
      badge: 'Mais popular',
    },
  ],

  finalHeadline: [
    'Seus jogadores merecem',
    'uma dungeon à altura',
    'da história que você criou.',
  ],
  finalCta: 'Entrar na Guilda — agora',
  finalSupportPrefix: 'Grupo no WhatsApp · Gratuito ·',

  faqEyebrow: 'Dúvidas',
  faqHeadline: 'Perguntas frequentes',
  faqItems: [
    {
      q: 'A Guilda é realmente gratuita?',
      a: 'Sim. A Guilda é o grupo de WhatsApp da DungeonBox — gratuito, sem compromisso de assinatura. Você entra, acompanha a produção, e assina quando quiser. Ninguém vai te pressionar.',
    },
    {
      q: 'Quantas pessoas já estão na Guilda?',
      a: 'Mais de 90 mestres já fazem parte da comunidade e recebem kits mensalmente.',
    },
    {
      q: 'As peças de meses diferentes encaixam?',
      a: 'Sim. Todo kit usa o padrão OpenLOCK — peças do Mês 1 encaixam no Mês 12 e em qualquer produto Rampage. Sua dungeon cresce sem limite e sem incompatibilidade.',
    },
    {
      q: 'Posso cancelar quando quiser?',
      a: 'Sim. Sem carência e sem multa. Cancele pelo painel e pare de ser cobrado no próximo ciclo. As peças que você já recebeu ficam com você.',
    },
    {
      q: 'Quanto tempo demora para chegar?',
      a: SUBSCRIPTION_DELIVERY_FAQ_ANSWER,
    },
    {
      q: 'Quais formas de pagamento são aceitas?',
      a: 'Cartão de crédito com cobrança recorrente automática todo mês.',
    },
    {
      q: 'As peças vêm pintadas?',
      a: 'Não — enviamos em cinza pedra, prontas para pintar ou usar na mesa. Na primeira caixa você pode adicionar um kit de pintura opcional (cobrança única).',
    },
    {
      q: 'Como funciona o frete?',
      a: 'Calculado pelo CEP no checkout em todos os planos.',
    },
    {
      q: 'Para qual sistema de RPG as peças servem?',
      a: 'Qualquer sistema com grid 28mm — D&D 5e, Tormenta RPG, Pathfinder, Old Dragon, Shadowdark e outros. Se a miniatura cabe num quadrado de 2,5 cm, funciona.',
    },
    {
      q: 'Posso fazer upgrade de plano?',
      a: 'Sim, a qualquer momento pelo painel. O upgrade vale no próximo ciclo de cobrança e você recebe o kit maior no mês seguinte.',
    },
  ],
} as const;

export function guildSocialBadge(memberCount: number): string {
  return `${memberCount} mestres já na Guilda`;
}

export function guildFinalSupport(memberCount: number): string {
  return `Grupo no WhatsApp · Gratuito · ${memberCount} mestres já dentro`;
}
