import type { PlanAccent } from '@/lib/plan-theme';

export const launchPillars = [
  {
    icon: 'castle' as const,
    title: 'Cresce todo mês',
    description:
      'Todo kit novo encaixa perfeitamente no anterior. Mês 1 é a entrada. Mês 12 é uma dungeon épica completa.',
  },
  {
    icon: 'link' as const,
    title: 'Tudo compatível',
    description:
      'Sistema OpenLOCK — o padrão mais usado do mundo. Peças de meses diferentes encaixam entre si para sempre.',
  },
  {
    icon: 'box' as const,
    title: 'Produzido pra você',
    description:
      'Cada kit é impresso após o pedido. Qualidade máxima, sem estoque parado. PLA premium, escala 28mm.',
  },
];

export type LaunchPlanId = 'aventureiro' | 'heroi' | 'lendario';

export type LaunchPlan = {
  id: LaunchPlanId;
  name: string;
  order: number;
  accent: PlanAccent;
  featured: boolean;
  badge?: string;
  image: string;
  pieces: string;
  specs: string[];
  builds: string;
  table: string;
  session: string;
  perks: string[];
  bgSolid: string;
  imagePosition: 'left' | 'right';
};

export const launchPlans: LaunchPlan[] = [
  {
    id: 'aventureiro',
    name: 'Aventureiro',
    order: 1,
    accent: 'silver',
    featured: false,
    image: '/images/plano-aventureiro.png',
    pieces: '56 peças',
    specs: [
      '30 tiles de piso',
      '12 colunas (I, L e O)',
      '14 clips OpenLOCK',
    ],
    builds: 'Monta: 3–4 salas',
    table: 'Mesa: 40×40cm',
    session: 'Sessão: 1–2 horas',
    perks: [
      'Kit temático mensal',
      'Sistema OpenLOCK',
      'Bilhete do mestre',
      'Compatível com meses anteriores',
    ],
    bgSolid: '#222833',
    imagePosition: 'left',
  },
  {
    id: 'heroi',
    name: 'Herói',
    order: 2,
    accent: 'ember',
    featured: true,
    badge: 'Mais popular',
    image: '/images/plano-heroi.png',
    pieces: '86 peças',
    specs: [
      'Tudo do Aventureiro',
      '+ 20 tiles extras',
      '+ 10 itens de decoração',
    ],
    builds: 'Monta: 5–7 salas',
    table: 'Mesa: 60×70cm',
    session: 'Sessão: 3–4 horas',
    perks: [
      'Tudo do Aventureiro',
      'Barris, baús, tochas e porta',
      'Dungeon habitada desde o kit 1',
      'Acesso ao grupo VIP de assinantes',
    ],
    bgSolid: '#3a1f12',
    imagePosition: 'right',
  },
  {
    id: 'lendario',
    name: 'Lendário',
    order: 3,
    accent: 'frost',
    featured: false,
    image: '/images/plano-lendario.png',
    pieces: '122 peças',
    specs: [
      'Tudo do Herói',
      '+ 20 tiles extras',
      '+ Decoração premium',
      '+ 3 miniaturas exclusivas',
    ],
    builds: 'Monta: 8–10 salas',
    table: 'Mesa: 80×90cm',
    session: 'Sessão: campanha completa',
    perks: [
      'Tudo do Herói',
      'Altar, sarcófago, pilares e porta secreta',
      '3 miniaturas exclusivas (guerreiro, mago e esqueleto)',
      'Voto no tema do próximo mês',
      '10% off em compras avulsas',
      'Frete grátis',
    ],
    bgSolid: '#0c2a36',
    imagePosition: 'left',
  },
];

export const launchTestimonials = [
  {
    quote:
      'Finalmente algo que resolve o problema de cenário sem eu precisar passar o fim de semana montando tudo na mão.',
    author: 'Rafael M.',
    role: 'Mestre de D&D há 7 anos',
  },
  {
    quote:
      'Meu grupo sempre jogou no teatro da mente porque montar cenário era muito trabalho. A DungeonBox muda isso.',
    author: 'Lucas T.',
    role: 'DM de Tormenta RPG',
  },
  {
    quote:
      'O que mais me convenceu foi o sistema modular. Não é só um produto — é uma dungeon que cresce com a campanha.',
    author: 'Ana P.',
    role: 'Game Master de Pathfinder',
  },
];

export const launchFaqItems = [
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
    a: 'Cada kit é impresso após o pagamento — até 7 dias úteis de produção, mais o frete. Sul e Sudeste: 10–15 dias no total. Centro-Oeste e Nordeste: 15–20. Norte: 18–25.',
  },
  {
    q: 'Quais formas de pagamento são aceitas?',
    a: 'Cartão de crédito com cobrança recorrente automática todo mês, e Pix para o valor à vista do mês corrente.',
  },
  {
    q: 'As peças vêm pintadas?',
    a: 'Não — enviamos em cinza pedra, prontas para pintar ou usar na mesa. Na primeira caixa você pode adicionar um kit de pintura opcional (cobrança única).',
  },
  {
    q: 'Como funciona o frete?',
    a: 'Calculado pelo CEP no checkout. Nos planos Aventureiro e Herói o frete é por conta do cliente. No plano Lendário o frete é grátis para todo o Brasil.',
  },
  {
    q: 'Para qual sistema de RPG as peças servem?',
    a: 'Qualquer sistema com grid 28mm — D&D 5e, Tormenta RPG, Pathfinder, Old Dragon, Shadowdark e outros. Se a miniatura cabe num quadrado de 2,5 cm, funciona.',
  },
  {
    q: 'Posso fazer upgrade de plano?',
    a: 'Sim, a qualquer momento pelo painel. O upgrade vale no próximo ciclo de cobrança e você recebe o kit maior no mês seguinte.',
  },
];
