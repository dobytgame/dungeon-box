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
    pieces: '10–12 peças por mês',
    deliveryItems: [
      '10–12 peças 3D do tema do mês',
      'Pisos e paredes modulares encaixáveis',
      'Props temáticos de cenário',
      'Bilhete do mestre (PDF)',
      'Guia de montagem passo a passo',
    ],
    perks: [
      'Kit temático mensal',
      'Compatível com kits anteriores',
      'Bilhete do mestre',
      'Peças em cinza pedra prontas para pintar',
    ],
    cta: 'Assinar Aventureiro',
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
    badge: 'Mais Popular',
    image: '/images/plano-heroi.png',
    pieces: '18–22 peças por mês',
    deliveryItems: [
      '18–22 peças 3D do tema do mês',
      'Kit completo de piso, paredes e props',
      '3 props exclusivos do mês',
      'Bilhete do mestre + mapa expandido',
      'Acesso ao grupo VIP de assinantes',
      'Frete incluso Sul e Sudeste',
    ],
    perks: [
      'Kit temático completo',
      '3 props exclusivos',
      'Frete incluso Sul/Sudeste',
      'Grupo VIP de assinantes',
    ],
    cta: 'Assinar Herói',
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
    pieces: '28–35 peças por mês',
    deliveryItems: [
      '28–35 peças 3D do tema do mês',
      'Kit XL com múltiplas salas e corredores',
      'Peça surpresa exclusiva do mês',
      'Boss ou setpiece especial sazonal',
      'Voto no tema do próximo mês',
      'Frete grátis para todo o Brasil',
      '10% de desconto permanente na loja',
    ],
    perks: [
      'Kit temático XL',
      'Peça surpresa exclusiva',
      'Frete grátis Brasil todo',
      'Voto no tema do mês',
      '10% off na loja',
    ],
    cta: 'Assinar Lendário',
    imagePosition: 'left' as const,
    bgSolid: '#0c2a36',
  },
];

export const faqItems = [
  {
    q: 'As peças do mês 3 encaixam com as do mês 1?',
    a: 'Sim! Todos os kits usam o mesmo padrão de encaixe. Você está construindo uma dungeon expansível — não colecionando objetos soltos.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim, sem carência e sem multa. Cancele pelo painel e para de ser cobrado no próximo ciclo.',
  },
  {
    q: 'Qual o prazo de entrega?',
    a: 'Postamos entre os dias 18 e 22 de cada mês. Sul/Sudeste: 3–7 dias. Demais regiões: 7–14 dias úteis.',
  },
  {
    q: 'Para qual sistema de RPG as peças são compatíveis?',
    a: 'Escala padrão 25mm/28mm — compatível com D&D, Pathfinder, Tormenta RPG, Old Dragon e qualquer sistema com grid de 1 polegada.',
  },
  {
    q: 'As peças vêm pintadas?',
    a: 'Não — enviamos em cinza pedra, prontas para você pintar ou usar direto na mesa. Oferecemos kits de pintura opcionais no checkout.',
  },
  {
    q: 'Posso comprar kits anteriores?',
    a: 'Assinantes têm acesso à loja com desconto para adquirir edições anteriores enquanto houver estoque.',
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
