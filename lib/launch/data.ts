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
    specs: ['30 tiles de piso', '12 colunas', '14 clips'],
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
    specs: ['Tudo do Aventureiro + 20 tiles extras + 10 decoração'],
    builds: 'Monta: 5–7 salas',
    table: 'Mesa: 60×70cm',
    session: 'Sessão: 3–4 horas',
    perks: [
      'Tudo do Aventureiro',
      'Barris, baús, tochas, porta',
      'Dungeon habitada desde o kit 1',
      'Grupo VIP de assinantes',
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
      'Tudo do Herói + 20 tiles extras + decoração premium + 3 miniaturas',
    ],
    builds: 'Monta: 8–10 salas',
    table: 'Mesa: 80×90cm',
    session: 'Sessão: campanha completa',
    perks: [
      'Tudo do Herói',
      'Altar, sarcófago, pilares, porta secreta',
      '3 miniaturas exclusivas',
      'Voto no tema do próximo mês',
      '10% off em compras avulsas',
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
    a: 'Sim. Esse é o ponto central do projeto. Todo kit usa o sistema OpenLOCK — o padrão modular mais adotado do mundo. Uma peça do Mês 1 encaixa na do Mês 12. Sua dungeon cresce sem limite.',
  },
  {
    q: 'E se eu não gostar? Posso cancelar?',
    a: 'Sim. Sem carência, sem multa, sem burocracia. Você cancela pelo painel e para de ser cobrado no próximo ciclo. As peças que você já tem ficam com você para sempre.',
  },
  {
    q: 'Quanto tempo demora pra chegar depois que assino?',
    a: 'Cada kit é produzido após o pedido — não trabalhamos com estoque parado. O prazo de produção é de até 7 dias úteis, mais o frete da sua região. Sul e Sudeste: 10–15 dias no total. Demais regiões: 15–20 dias.',
  },
];
