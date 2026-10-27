import { PLAN_SLUGS, type PlanSlug } from '@/lib/checkout/plans';
import { plans } from '@/lib/data';

export type GuildDisplayPlan = {
  id: PlanSlug;
  name: string;
  price: number;
  tagline: string;
  detail: string;
  featured: boolean;
  badge?: string;
};

function planDetailFromCatalog(pieces: string, planId: PlanSlug): string {
  const normalized = pieces
    .replace(/^Aproximadamente\s+/i, '~')
    .replace(/\s*\(incl\. clips OpenLOCK\)/i, ' · incl. clipes OpenLOCK');

  if (planId === 'lendario') {
    return `${normalized} · 3 miniaturas no kit`;
  }
  return normalized;
}

export function getGuildDisplayPlans(): GuildDisplayPlan[] {
  return PLAN_SLUGS.map((slug) => {
    const plan = plans.find((entry) => entry.id === slug);
    if (!plan) {
      throw new Error(`Plano ausente no catálogo: ${slug}`);
    }
    return {
      id: slug,
      name: plan.name,
      price: plan.price,
      tagline: plan.tagline,
      detail: planDetailFromCatalog(plan.pieces, slug),
      featured: slug === 'lendario',
      badge: slug === 'lendario' ? plan.badge ?? 'Mais popular' : undefined,
    };
  });
}

export function guildStartingPriceLabel(): string {
  const min = Math.min(...getGuildDisplayPlans().map((plan) => plan.price));
  return `Planos a partir de R$ ${min.toLocaleString('pt-BR')}/mês + frete.`;
}
