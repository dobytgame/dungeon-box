import type { PlanAccent } from './plan-theme';

export const plans = [
  {
    id: 'aventureiro',
    name: 'Aventureiro',
    order: 1,
    price: 89,
    accent: 'silver' as PlanAccent,
    featured: false,
    badge: 'Plano base',
    image: '/images/plano-aventureiro.png',
    tagline: 'Sua primeira dungeon. Funcional no dia 1.',
    freight: '+ frete (calculado por CEP)',
    billingNote: 'Cobrado mensalmente · Cancele a qualquer momento',
    pieces: '60 peças',
    specs: [
      '16 tiles de piso',
      '12 paredes',
      '12 colunas (I, L e O)',
      '20 clips OpenLOCK',
    ],
    builds: 'Monta: 3–4 salas + corredores',
    table: 'Mesa: 40×40cm',
    session: 'Sessão: 1–2 horas',
    deliveryItems: [
      '16 tiles de piso (1×1, 1×2 e curvas)',
      '12 paredes (retas, longas e cantos)',
      '12 colunas (I, L e O)',
      '20 clips OpenLOCK',
      'Kit temático mensal + bilhete do mestre (PDF)',
    ],
    perks: [
      'Kit temático mensal',
      'Sistema OpenLOCK — encaixa com todos os meses',
      'Bilhete do mestre incluído',
      'Compatível com todos os kits anteriores e futuros',
    ],
    cta: 'Assinar agora — R$89/mês',
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
    tagline: 'A dungeon do Mestre. Com atmosfera desde o kit 1.',
    freight: '+ frete (calculado por CEP)',
    billingNote: 'Cobrado mensalmente · Cancele a qualquer momento',
    pieces: '93 peças',
    specs: [
      'Tudo do Aventureiro',
      '+ 20 tiles extras',
      '+ itens de decoração',
    ],
    builds: 'Monta: 3–4 salas + rede de corredores',
    table: 'Mesa: 50×60cm',
    session: 'Sessão: 3–4 horas',
    differentiator:
      '+33 peças a mais que o Aventureiro. Sua dungeon passa de ambiente vazio para cena viva.',
    deliveryItems: [
      'Tudo do plano Aventureiro',
      '+ 20 tiles extras',
      '+ itens de decoração (barris, baús, tochas)',
      'Bilhete do mestre + mapa expandido',
    ],
    perks: [
      'Tudo do plano Aventureiro',
      '20 tiles extras — mais salas, mais possibilidades',
      'Dungeon habitada com atmosfera desde o primeiro kit',
    ],
    cta: 'Assinar agora — R$139/mês',
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
    badge: 'Premium',
    image: '/images/plano-lendario.png',
    tagline: 'A experiência épica completa. Para mestres que não aceitam menos.',
    freight: '+ frete (calculado por CEP)',
    billingNote: 'Cobrado mensalmente · Cancele a qualquer momento',
    pieces: '132 peças',
    specs: [
      'Tudo do Herói',
      '+ 20 tiles extras',
      '+ Decoração premium',
      '+ 3 miniaturas exclusivas',
    ],
    builds: 'Monta: 5–6 salas + decoração premium + 3 miniaturas',
    table: 'Mesa: 70×80cm',
    session: 'Sessão: campanha completa (múltiplas sessões)',
    differentiator:
      '+39 peças a mais que o Herói. 3 miniaturas exclusivas. A dungeon que seus jogadores vão lembrar.',
    deliveryItems: [
      'Tudo do plano Herói',
      '+ 20 tiles extras',
      '+ Decoração premium (altar, sarcófago, pilares, porta)',
      '+ 3 miniaturas exclusivas (guerreiro, mago e esqueleto)',
      'Voto no tema do próximo mês',
    ],
    perks: [
      'Tudo do plano Herói',
      '20 tiles extras — dungeons de 5–6 salas completas',
      '3 miniaturas exclusivas em 28mm (guerreiro, mago e esqueleto)',
      'Voto no tema do próximo mês',
      '10% de desconto em todos os produtos avulsos',
    ],
    cta: 'Assinar agora — R$199/mês',
    imagePosition: 'left' as const,
    bgSolid: '#0c2a36',
  },
];

export const planSupportCopy = {
  heroTitleLine1: 'Escolha seu plano.',
  heroTitleLine2: 'Cada mês sua dungeon fica maior.',
  heroSubtitle:
    'Três planos. Um sistema. As peças de hoje encaixam nas de amanhã.',
  evolutionTitle: 'Cada plano cresce sobre o anterior.',
  evolution:
    'Começou no Aventureiro? Perfeito. Quando fizer upgrade para o Herói, você recebe exatamente as peças que estão faltando — tudo encaixando perfeitamente. Sem desperdício. Sem peça duplicada. Sua dungeon cresce todo mês.',
  guarantee: 'Sem carência · Sem multa · Cancele quando quiser',
  guaranteeExtended:
    'Sem carência · Cancele quando quiser · Sem multa · Produção sob demanda · Sistema OpenLOCK · Escala 28mm',
  compatibility:
    'Compatível com D&D 5e · Tormenta RPG · Pathfinder · Old Dragon · Escala 28mm',
  piecesEstimateNote:
    'Quantidade estimada por kit. Pode variar conforme o tema do mês, chegando até o total informado ou próximo dele.',
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

export { campaignMonths as themes } from './campaign-calendar';

export const marqueeItems = [
  'Cenários 3D',
  'Sistema Modular',
  'Todo Mês',
  'Compatível',
  'Impressão Premium',
  'Grid 28mm',
];
