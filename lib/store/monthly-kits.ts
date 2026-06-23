import type { SupabaseClient } from '@supabase/supabase-js';
import { relOne } from '@/lib/dashboard/format';
import type { Subscription, Theme } from '@/lib/dashboard/types';
import type { StoreProduct } from '@/lib/store/catalog';

export const MONTHLY_KIT_PRODUCT_PREFIX = 'monthly-kit:';

export function isMonthlyKitProductId(productId: string): boolean {
  return productId.startsWith(MONTHLY_KIT_PRODUCT_PREFIX);
}

export function parseMonthlyKitSubscriptionId(productId: string): string | null {
  if (!isMonthlyKitProductId(productId)) return null;
  const id = productId.slice(MONTHLY_KIT_PRODUCT_PREFIX.length);
  return id.length > 0 ? id : null;
}

export function monthlyKitProductId(subscriptionId: string): string {
  return `${MONTHLY_KIT_PRODUCT_PREFIX}${subscriptionId}`;
}

export function subscriptionEligibleForMonthlyKit(subscription: {
  status: string;
}): boolean {
  return subscription.status === 'active' || subscription.status === 'past_due';
}

function formatPriceLabel(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export async function getCurrentMonthlyTheme(
  supabase: SupabaseClient
): Promise<Theme | null> {
  const { data } = await supabase
    .from('themes')
    .select('*')
    .eq('is_active', true)
    .order('year', { ascending: false })
    .order('month_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as Theme | null) ?? null;
}

export function buildMonthlyKitProduct(
  subscription: Subscription,
  theme: Theme
): StoreProduct | null {
  const plan = relOne(subscription.plans);
  if (!plan?.price_cents) return null;

  const planName = plan.name;
  const themeLabel = theme.emoji ? `${theme.emoji} ${theme.name}` : theme.name;

  return {
    id: monthlyKitProductId(subscription.id),
    slug: `kit-mes-${plan.slug}-${theme.slug}`,
    name: `Kit do mês — ${planName}`,
    tagline: `${themeLabel} · cópia extra do kit da sua assinatura`,
    priceCents: plan.price_cents,
    priceLabel: formatPriceLabel(plan.price_cents),
    includes: [
      `Mesmo conteúdo do plano ${planName} deste mês`,
      `${plan.pieces_min}–${plan.pieces_max} peças do tema ${theme.name}`,
      'Enviado junto com sua próxima caixa — sem frete',
    ],
    category: 'monthly-kit',
    subscriberOnly: true,
    requiresSubscriptionBundle: true,
    subscriptionId: subscription.id,
    themeId: theme.id,
    themeName: theme.name,
    themeEmoji: theme.emoji,
    planName,
    planSlug: plan.slug,
    maxQuantity: 9,
  };
}

export async function getMonthlyKitProductsForUser(
  supabase: SupabaseClient,
  subscriptions: Subscription[]
): Promise<StoreProduct[]> {
  const theme = await getCurrentMonthlyTheme(supabase);
  if (!theme) return [];

  return subscriptions
    .filter(subscriptionEligibleForMonthlyKit)
    .map((subscription) => buildMonthlyKitProduct(subscription, theme))
    .filter((product): product is StoreProduct => product !== null);
}

export type MonthlyKitOrderItem = {
  productId: string;
  quantity: number;
  subscriptionId: string;
  themeId: string;
  themeName: string;
  planName: string;
  priceCents: number;
  lineTotalCents: number;
};

export async function resolveMonthlyKitOrderItem(
  supabase: SupabaseClient,
  userId: string,
  productId: string,
  quantity: number
): Promise<MonthlyKitOrderItem | { error: string }> {
  const subscriptionId = parseMonthlyKitSubscriptionId(productId);
  if (!subscriptionId) {
    return { error: 'Kit do mês inválido.' };
  }

  const theme = await getCurrentMonthlyTheme(supabase);
  if (!theme) {
    return { error: 'Nenhum tema do mês disponível para compra no momento.' };
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, status, user_id, plans!plan_id(name, slug, price_cents, pieces_min, pieces_max)')
    .eq('id', subscriptionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!subscription || !subscriptionEligibleForMonthlyKit(subscription)) {
    return {
      error: 'Assinatura inválida ou inativa para compra do kit do mês.',
    };
  }

  const product = buildMonthlyKitProduct(subscription as Subscription, theme);
  if (!product) {
    return { error: 'Não foi possível calcular o preço do kit do mês.' };
  }

  const qty = Math.min(Math.max(Math.floor(quantity), 1), product.maxQuantity ?? 9);

  return {
    productId,
    quantity: qty,
    subscriptionId,
    themeId: theme.id,
    themeName: theme.name,
    planName: product.planName ?? 'Plano',
    priceCents: product.priceCents,
    lineTotalCents: product.priceCents * qty,
  };
}
