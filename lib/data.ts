import type { PlanAccent } from './plan-theme';

export const plans = [
  {
    id: 'aventureiro',
    name: 'Aventureiro',
    order: 1,
    price: 89,
    accent: 'silver' as PlanAccent,
    featured: false,
    image: '/images/plano-aventureiro.png',
    tagline: 'Sua primeira dungeon. Funcional no dia 1.',
    freight: '+ frete',
    pieces: '56 peças',
    specs: ['30 tiles de piso', '12 colunas (I, L e O)', '14 clips OpenLOCK'],
    builds: 'Monta: 3–4 salas',
    table: 'Mesa: 40×40cm',
    session: 'Sessão: 1–2 horas',
    deliveryItems: [
      '30 tiles de piso',
      '12 colunas (I, L e O)',
      '14 clips OpenLOCK',
      'Kit temático mensal + bilhete do mestre (PDF)',
    ],
    perks: [
      'Kit temático mensal',
      'Sistema OpenLOCK',
      'Bilhete do mestre',
      'Compatível com meses anteriores',
    ],
    cta: 'Assinar agora',
    imagePosition: 'left' as const,
    bgSolid: '#222833',
  },
  {
    id: 'heroi',
    name: 'Herói',
    order: 2,
    price: 139,
    accent: 'ember' as PlanAccent,
    featured: true,
    badge: 'Mais popular',
    image: '/images/plano-heroi.png',
    tagline: 'A dungeon do Mestre. Atmosfera completa.',
    freight: '+ frete',
    pieces: '86 peças',
    specs: [
      'Tudo do Aventureiro',
      '+ 20 tiles extras',
      '+ 10 itens de decoração',
    ],
    builds: 'Monta: 5–7 salas',
    table: 'Mesa: 60×70cm',
    session: 'Sessão: 3–4 horas',
    deliveryItems: [
      'Tudo do plano Aventureiro',
      '+ 20 tiles extras',
      '+ 10 itens de decoração (barris, baús, tochas, porta)',
      'Bilhete do mestre + mapa expandido',
      'Acesso ao grupo VIP de assinantes',
    ],
    perks: [
      'Tudo do Aventureiro',
      'Barris, baús, tochas e porta',
      'Dungeon habitada desde o kit 1',
      'Acesso ao grupo VIP de assinantes',
    ],
    cta: 'Assinar agora',
    imagePosition: 'right' as const,
    bgSolid: '#3a1f12',
  },
  {
    id: 'lendario',
    name: 'Lendário',
    order: 3,
    price: 199,
    accent: 'frost' as PlanAccent,
    featured: false,
    image: '/images/plano-lendario.png',
    tagline: 'A experiência épica. Campanha completa na mesa.',
    freight: 'Frete grátis para todo o Brasil',
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
    deliveryItems: [
      'Tudo do plano Herói',
      '+ 20 tiles extras',
      '+ Decoração premium (altar, sarcófago, pilares, porta secreta)',
      '+ 3 miniaturas exclusivas (guerreiro, mago e esqueleto)',
      'Voto no tema do próximo mês',
      'Frete grátis para todo o Brasil',
    ],
    perks: [
      'Tudo do Herói',
      'Altar, sarcófago, pilares e porta secreta',
      '3 miniaturas exclusivas (guerreiro, mago e esqueleto)',
      'Voto no tema do próximo mês',
      '10% off em compras avulsas',
      'Frete grátis',
    ],
    cta: 'Assinar agora',
    imagePosition: 'left' as const,
    bgSolid: '#0c2a36',
  },
];

export const planSupportCopy = {
  evolution:
    'Cada plano inclui tudo do anterior. Começou no Aventureiro? Faça upgrade e receba só o que está faltando — tudo encaixando perfeitamente.',
  guarantee: 'Sem carência · Sem multa · Cancele quando quiser',
  compatibility:
    'Compatível com D&D 5e · Tormenta RPG · Pathfinder · Old Dragon · Escala 28mm · Sistema OpenLOCK',
};

export const faqItems = [
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

export type LoyaltyAccent = 'silver' | 'ember' | 'frost' | 'gold';

export const loyaltyLevels = [
  {
    level: 1,
    icon: 'sword',
    name: 'Recruta',
    months: 'Mês 1–2',
    accent: 'silver' as LoyaltyAccent,
    perks: ['Acesso ao grupo VIP', 'Bilhete do mestre'],
  },
  {
    level: 2,
    icon: 'swords',
    name: 'Aventureiro',
    months: 'Mês 3–5',
    accent: 'silver' as LoyaltyAccent,
    perks: ['+1 prop bônus', '5% off loja', 'Preview de temas'],
  },
  {
    level: 3,
    icon: 'bow',
    name: 'Veterano',
    months: 'Mês 6–9',
    accent: 'ember' as LoyaltyAccent,
    perks: ['+2 props bônus', '10% off loja', 'Voto no tema'],
  },
  {
    level: 4,
    icon: 'shield',
    name: 'Campeão',
    months: 'Mês 10–12',
    accent: 'ember' as LoyaltyAccent,
    perks: ['Peça exclusiva', '15% off loja', 'Prioridade de produção'],
  },
  {
    level: 5,
    icon: 'crown',
    name: 'Lendário',
    months: '1 Ano',
    accent: 'gold' as LoyaltyAccent,
    perks: ['Boss exclusivo na 13ª box', '20% off permanente', 'Co-criação do tema'],
  },
];

export const themes = [
  { month: '01', icon: 'ruins', name: 'A Entrada', lore: 'O começo de tudo.' },
  { month: '02', icon: 'skull', name: 'Cripta', lore: 'Os mortos não descansam.' },
  { month: '03', icon: 'tavern', name: 'Taverna', lore: 'Negócios se fazem aqui.' },
  { month: '04', icon: 'shrine', name: 'Santuário', lore: 'A luz que não deveria existir.' },
  { month: '05', icon: 'camp', name: 'Acampamento', lore: 'Descanso antes da batalha.' },
  { month: '06', icon: 'market', name: 'Mercado das Sombras', lore: 'Tudo tem um preço.' },
  { month: '07', icon: 'lab', name: 'Laboratório', lore: 'O arcanista estava aqui.' },
  { month: '08', icon: 'prison', name: 'Prisão', lore: 'As celas estão abertas.' },
  { month: '09', icon: 'sewer', name: 'Esgotos', lore: 'Outra cidade. Mais perigosa.' },
  { month: '10', icon: 'throne', name: 'Câmara do Rei', lore: 'O trono está vazio.' },
  { month: '11', icon: 'forest', name: 'Floresta', lore: 'As árvores têm dentes.' },
  { month: '12', icon: 'dragon', name: 'Covil do Dragão', lore: 'Você chegou até aqui.' },
];

export const marqueeItems = [
  'Cenários 3D',
  'Sistema Modular',
  'Todo Mês',
  'Compatível',
  'Impressão Premium',
  'Grid 28mm',
];
