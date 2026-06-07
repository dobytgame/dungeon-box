import type { PlanSlug } from '@/lib/checkout/plans';

const PRICE_ENV: Record<PlanSlug, string | undefined> = {
  aventureiro: process.env.STRIPE_PRICE_AVENTUREIRO,
  heroi: process.env.STRIPE_PRICE_HEROI,
  lendario: process.env.STRIPE_PRICE_LENDARIO,
};

export function getStripePriceId(slug: PlanSlug): string | null {
  const id = PRICE_ENV[slug]?.trim();
  return id || null;
}

export function assertStripePriceId(slug: PlanSlug): string {
  const id = getStripePriceId(slug);
  if (!id) {
    throw new Error(`Stripe Price ID não configurado para o plano "${slug}".`);
  }
  return id;
}
