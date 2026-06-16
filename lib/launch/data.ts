import type { PlanAccent } from '@/lib/plan-theme';
import { plans } from '@/lib/data';

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
  price: number;
  freight: string;
  billingNote: string;
  tagline: string;
  accent: PlanAccent;
  featured: boolean;
  badge?: string;
  differentiator?: string;
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

export const launchPlans: LaunchPlan[] = plans.map((plan) => ({
  id: plan.id as LaunchPlanId,
  name: plan.name,
  order: plan.order,
  price: plan.price,
  freight: plan.freight,
  billingNote: plan.billingNote,
  tagline: plan.tagline,
  accent: plan.accent,
  featured: plan.featured,
  badge: plan.badge,
  differentiator: plan.differentiator,
  image: plan.image,
  pieces: plan.pieces,
  specs: plan.specs,
  builds: plan.builds,
  table: plan.table,
  session: plan.session,
  perks: plan.perks,
  bgSolid: plan.bgSolid,
  imagePosition: plan.imagePosition,
}));

export const launchTestimonials = [
  {
    quote:
      'Quando vi o sistema OpenLOCK encaixando as peças do mês 1 com as do mês 2, entendi que isso é diferente de tudo que já comprei para mesa. Não é só um produto — é uma dungeon que cresce junto com a campanha.',
    author: 'Rafael M.',
    role: 'São Paulo · Mestre de D&D há 7 anos',
  },
  {
    quote:
      'Joguei Tormenta por 4 anos sem nenhum cenário físico — teatro da mente era a única opção viável. Quando vi que a caixa do Mês 1 já monta de 3 a 4 salas com tiles de piso, colunas e clips encaixados, percebi que finalmente é possível ter imersão visual sem virar marceneiro todo final de semana.',
    author: 'Lucas T.',
    role: 'Rio de Janeiro · DM de Tormenta RPG',
  },
  {
    quote:
      'Compro miniaturas avulsas há anos. O custo sempre foi o problema — cada sala nova virava um projeto de R$ 200. A lógica de assinatura da DungeonBox resolve isso: a dungeon cresce todo mês, no ritmo da campanha, sem estouro no orçamento.',
    author: 'Ana P.',
    role: 'Belo Horizonte · Game Master de Pathfinder',
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
