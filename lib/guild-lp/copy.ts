import { SUBSCRIPTION_DELIVERY_FAQ_ANSWER } from '@/lib/production/lead-time';

export const guildLpCopy = {
  heroEyebrow: 'Assinatura mensal de cenários 3D para RPG',
  heroHeadline: ['Dê vida à', 'sua próxima', 'sessão de RPG.'],
  heroSub:
    'Receba cenários físicos com pisos, paredes e acessórios para montar sua dungeon. As peças usam encaixes OpenLOCK e permitem combinar os kits da sua coleção.',
  heroPrimaryCta: 'Escolher meu plano',
  heroSecondaryCta: 'Tirar dúvidas no WhatsApp',
  heroSupport:
    'Produto físico entregue em casa · Peças modulares OpenLOCK · Prazo informado antes da compra',
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
      title: 'Escolha seu plano',
      body: 'Compare o conteúdo e consulte o frete para seu CEP no checkout.',
    },
    {
      n: '02',
      title: 'Receba sua caixa',
      body: 'Produzimos o kit após a confirmação do pagamento e informamos o acompanhamento do envio.',
    },
    {
      n: '03',
      title: 'Monte e expanda',
      body: 'Combine as peças para criar encontros e ampliar sua coleção nos próximos ciclos.',
    },
  ],

  initialKitEyebrow: 'Primeira entrega',
  initialKitTitle: 'Sua primeira caixa',
  initialKitBody: (kitName: string) =>
    `Sua assinatura começa pelo kit ${kitName}. Escolha o plano e confira o conteúdo da sua primeira caixa antes de concluir a compra.`,
  initialKitBodyFallback:
    'Sua assinatura começa pelo kit inicial da coleção. Escolha o plano e confira o conteúdo da sua primeira caixa antes de concluir a compra.',
  initialKitPlanNote:
    'O volume de peças e miniaturas varia conforme o plano escolhido.',
  initialKitFinishNote:
    'Peças enviadas em acabamento cinza pedra, prontas para pintar ou usar na mesa.',
  initialKitShippingNote: 'Frete calculado pelo CEP no checkout.',
  initialKitSwapNote:
    'Você pode trocar o tema pelo painel enquanto o kit ainda não entrou em produção.',
  initialKitImageFallback: 'Imagem do kit inicial em breve.',

  benefitsEyebrow: 'Comunidade',
  benefitsHeadline: ['Quer acompanhar', 'os próximos kits?'],
  benefitsIntro:
    'Entre na Guilda DungeonBox para acompanhar bastidores, conversar sobre os cenários e receber novidades da coleção. A participação no grupo é gratuita e não exige assinatura.',
  guildInviteCta: 'Entrar na Guilda gratuita',
  benefitsSupportCta: 'Tirar dúvidas no WhatsApp',

  plansEyebrow: 'Planos',
  plansHeadline: 'Compare os planos',
  plansSub:
    'Escolha o plano que combina com sua mesa. Cobrança mensal — cancele conforme as condições do plano.',
  plansNote: '+ frete calculado por CEP · Sem carência · Cancele quando quiser',
  planChooseLabel: (planName: string) => `Escolher ${planName}`,

  shippingEyebrow: 'Frete e prazo',
  shippingTitle: 'Estime a entrega antes de assinar',
  shippingSub:
    'Informe seu CEP e o plano desejado. A cobrança final e o frete definitivos são confirmados no checkout.',

  finalHeadline: ['Escolha o próximo', 'cenário', 'da sua mesa.'],
  finalPrimaryCta: 'Comparar os planos',
  finalSecondaryCta: 'Tirar dúvidas no WhatsApp',

  faqEyebrow: 'Dúvidas',
  faqHeadline: 'Perguntas frequentes',
  faqItems: [
    {
      q: 'Preciso entrar no grupo para assinar?',
      a: 'Não. Você pode escolher seu plano e contratar pelo site. A Guilda é opcional, para quem quer acompanhar novidades e conversar com a comunidade.',
    },
    {
      q: 'Qual caixa eu recebo primeiro?',
      a: 'Todas as assinaturas começam pelo kit 1. Você pode trocar o tema pelo painel, desde que o kit ainda não tenha entrado em produção.',
    },
    {
      q: 'A Guilda é realmente gratuita?',
      a: 'Sim. A Guilda é o grupo de WhatsApp da DungeonBox — gratuito, sem compromisso de assinatura. Você entra quando quiser acompanhar bastidores e novidades.',
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
