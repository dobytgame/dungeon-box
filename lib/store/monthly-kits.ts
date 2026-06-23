import type { SupabaseClient } from '@supabase/supabase-js';
import { PLAN_SLUGS, type PlanSlug } from '@/lib/checkout/plans';
import { campaignMonths } from '@/lib/campaign-calendar';
import { plans as staticPlans } from '@/lib/data';
import { relOne } from '@/lib/dashboard/format';
import type { Plan, Subscription, Theme } from '@/lib/dashboard/types';
import { createAdminClient } from '@/lib/supabase/admin';
import type { StoreProduct } from '@/lib/store/catalog';

/** UUID fixo só para metadados quando o tema vem do calendário editorial. */
const CALENDAR_FALLBACK_THEME_ID = '00000000-0000-4000-8000-000000000001';

export const MONTHLY_KIT_PRODUCT_PREFIX = 'monthly-kit:';

export type MonthlyKitStoreAvailability = {
  products: StoreProduct[];
  hasEligibleSubscription: boolean;
  hasTheme: boolean;
  issue?: 'no_subscription' | 'no_theme' | 'no_plan';
};

export function isMonthlyKitProductId(productId: string): boolean {
  return productId.startsWith(MONTHLY_KIT_PRODUCT_PREFIX);
}

export function parseMonthlyKitPlanSlug(productId: string): PlanSlug | null {
  if (!isMonthlyKitProductId(productId)) return null;
  const slug = productId.slice(MONTHLY_KIT_PRODUCT_PREFIX.length);
  return (PLAN_SLUGS as readonly string[]).includes(slug) ? (slug as PlanSlug) : null;
}

export function monthlyKitProductId(planSlug: PlanSlug): string {
  return `${MONTHLY_KIT_PRODUCT_PREFIX}${planSlug}`;
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

function fallbackPlanFromStatic(slug: string): Plan | null {
  const staticPlan = staticPlans.find((plan) => plan.id === slug);
  if (!staticPlan) return null;

  const piecesMatch = staticPlan.pieces.match(/(\d+)/);
  const pieces = piecesMatch ? Number.parseInt(piecesMatch[1]!, 10) : 60;

  return {
    id: slug,
    slug,
    name: staticPlan.name,
    description: staticPlan.tagline ?? null,
    price_cents: staticPlan.price * 100,
    pieces_min: pieces,
    pieces_max: pieces,
    color_choices: 1,
    freight_free: false,
    freight_regions: null,
    store_discount: 0,
    has_vip_group: false,
    has_vote: false,
    accent_color: null,
  };
}

async function fetchAllSellablePlans(admin: SupabaseClient): Promise<Plan[]> {
  const { data, error } = await admin
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[store] fetchAllSellablePlans:', error.message);
  }

  const dbPlans = (data ?? []) as Plan[];
  const result: Plan[] = [];

  for (const slug of PLAN_SLUGS) {
    const fromDb = dbPlans.find((plan) => plan.slug === slug);
    if (fromDb?.price_cents && fromDb.price_cents > 0) {
      result.push(fromDb);
      continue;
    }
    const fallback = fallbackPlanFromStatic(slug);
    if (fallback) result.push(fallback);
  }

  return result;
}

async function resolvePlanBySlug(
  admin: SupabaseClient,
  planSlug: PlanSlug
): Promise<Plan | null> {
  const { data } = await admin
    .from('plans')
    .select('*')
    .eq('slug', planSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (data?.price_cents && data.price_cents > 0) {
    return data as Plan;
  }

  return fallbackPlanFromStatic(planSlug);
}

function fallbackThemeFromCalendar(): Theme {
  const now = new Date();
  const monthNumber = now.getMonth() + 1;
  const entry = campaignMonths[monthNumber - 1] ?? campaignMonths[0]!;

  return {
    id: CALENDAR_FALLBACK_THEME_ID,
    month_number: monthNumber,
    year: now.getFullYear(),
    slug: entry.icon,
    name: entry.name,
    lore: entry.revealed ? entry.lore : null,
    emoji: null,
    image_url: null,
    is_active: true,
    is_revealed: entry.revealed,
  };
}

async function getThemeFromSubscriptionCycle(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<Theme | null> {
  const { data: cycle } = await admin
    .from('subscription_cycles')
    .select('theme_id, themes(*)')
    .eq('subscription_id', subscriptionId)
    .not('theme_id', 'is', null)
    .order('cycle_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  return relOne(cycle?.themes as Theme | Theme[] | null);
}

async function queryLatestTheme(
  admin: SupabaseClient,
  filter?: { column: 'is_active' | 'is_revealed'; value: boolean }
): Promise<Theme | null> {
  let query = admin.from('themes').select('*');

  if (filter) {
    query = query.eq(filter.column, filter.value);
  }

  const { data, error } = await query
    .order('year', { ascending: false })
    .order('month_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[store] queryLatestTheme:', error.message);
  }

  return (data as Theme | null) ?? null;
}

async function fetchEligibleSubscriptionsFromClient(
  client: SupabaseClient,
  userId: string
): Promise<Subscription[]> {
  const { data, error } = await client
    .from('subscriptions')
    .select('*, plans!plan_id(*)')
    .eq('user_id', userId)
    .in('status', ['active', 'past_due'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[store] fetchEligibleSubscriptions:', error.message);
    return [];
  }

  return (data ?? []) as Subscription[];
}

async function fetchEligibleSubscriptions(
  admin: SupabaseClient,
  userId: string,
  fallback?: SupabaseClient
): Promise<Subscription[]> {
  const primary = await fetchEligibleSubscriptionsFromClient(admin, userId);
  if (primary.length > 0 || !fallback) return primary;
  return fetchEligibleSubscriptionsFromClient(fallback, userId);
}

export async function getCurrentMonthlyTheme(
  admin: SupabaseClient,
  subscriptions: Subscription[] = []
): Promise<Theme | null> {
  for (const subscription of subscriptions) {
    const fromCycle = await getThemeFromSubscriptionCycle(admin, subscription.id);
    if (fromCycle) return fromCycle;
  }

  const active = await queryLatestTheme(admin, { column: 'is_active', value: true });
  if (active) return active;

  const revealed = await queryLatestTheme(admin, {
    column: 'is_revealed',
    value: true,
  });
  if (revealed) return revealed;

  const latest = await queryLatestTheme(admin);
  if (latest) return latest;

  return fallbackThemeFromCalendar();
}

function buildMonthlyKitProduct(plan: Plan, theme: Theme): StoreProduct {
  const planName = plan.name;
  const themeLabel = theme.emoji ? `${theme.emoji} ${theme.name}` : theme.name;

  return {
    id: monthlyKitProductId(plan.slug as PlanSlug),
    slug: `kit-mes-${plan.slug}-${theme.slug}`,
    name: `Kit do mês — ${planName}`,
    tagline: `${themeLabel} · cópia extra do tema ${theme.name}`,
    priceCents: plan.price_cents,
    priceLabel: formatPriceLabel(plan.price_cents),
    includes: [
      `Conteúdo completo do plano ${planName}`,
      `${plan.pieces_min}–${plan.pieces_max} peças do tema ${theme.name}`,
      'Enviado junto com sua próxima caixa — sem frete',
    ],
    category: 'monthly-kit',
    subscriberOnly: true,
    requiresSubscriptionBundle: true,
    themeId: theme.id,
    themeName: theme.name,
    themeEmoji: theme.emoji,
    planName,
    planSlug: plan.slug,
    featured: plan.slug === 'heroi',
    maxQuantity: 9,
  };
}

export async function getMonthlyKitStoreAvailability(
  userId: string,
  userSupabase?: SupabaseClient
): Promise<MonthlyKitStoreAvailability> {
  const admin = createAdminClient();
  const subscriptions = await fetchEligibleSubscriptions(
    admin,
    userId,
    userSupabase
  );

  if (subscriptions.length === 0) {
    return {
      products: [],
      hasEligibleSubscription: false,
      hasTheme: false,
      issue: 'no_subscription',
    };
  }

  const theme = await getCurrentMonthlyTheme(admin, subscriptions);
  if (!theme) {
    return {
      products: [],
      hasEligibleSubscription: true,
      hasTheme: false,
      issue: 'no_theme',
    };
  }

  const plans = await fetchAllSellablePlans(admin);
  const products = plans.map((plan) => buildMonthlyKitProduct(plan, theme));

  if (products.length === 0) {
    return {
      products: [],
      hasEligibleSubscription: true,
      hasTheme: true,
      issue: 'no_plan',
    };
  }

  return {
    products,
    hasEligibleSubscription: true,
    hasTheme: true,
  };
}

export async function getMonthlyKitProductsForUser(
  userId: string,
  userSupabase?: SupabaseClient
): Promise<StoreProduct[]> {
  const availability = await getMonthlyKitStoreAvailability(userId, userSupabase);
  return availability.products;
}

export type MonthlyKitOrderItem = {
  productId: string;
  quantity: number;
  planSlug: PlanSlug;
  bundleSubscriptionId: string;
  themeId: string;
  themeName: string;
  planName: string;
  priceCents: number;
  lineTotalCents: number;
};

async function resolveMonthlyKitBundleSubscription(
  admin: SupabaseClient,
  userId: string,
  bundleSubscriptionId: string | null,
  fallback?: SupabaseClient
): Promise<string | { error: string }> {
  const subscriptions = await fetchEligibleSubscriptions(admin, userId, fallback);

  if (subscriptions.length === 0) {
    return { error: 'Assinatura ativa necessária para comprar kits do mês.' };
  }

  if (bundleSubscriptionId) {
    const match = subscriptions.find((sub) => sub.id === bundleSubscriptionId);
    if (!match) {
      return { error: 'Assinatura selecionada para envio é inválida.' };
    }
    return bundleSubscriptionId;
  }

  if (subscriptions.length === 1) {
    return subscriptions[0]!.id;
  }

  return {
    error: 'Selecione com qual assinatura enviar os kits do mês.',
  };
}

export async function resolveMonthlyKitOrderItem(
  supabase: SupabaseClient,
  userId: string,
  productId: string,
  quantity: number,
  bundleSubscriptionId: string | null,
  userSupabase?: SupabaseClient
): Promise<MonthlyKitOrderItem | { error: string }> {
  const planSlug = parseMonthlyKitPlanSlug(productId);
  if (!planSlug) {
    return { error: 'Kit do mês inválido.' };
  }

  const admin = createAdminClient();
  const bundleResult = await resolveMonthlyKitBundleSubscription(
    admin,
    userId,
    bundleSubscriptionId,
    userSupabase ?? supabase
  );

  if (typeof bundleResult !== 'string') {
    return bundleResult;
  }

  const subscriptions = await fetchEligibleSubscriptions(
    admin,
    userId,
    userSupabase ?? supabase
  );

  const theme = await getCurrentMonthlyTheme(admin, subscriptions);
  if (!theme) {
    return { error: 'Nenhum tema do mês disponível para compra no momento.' };
  }

  const plan = await resolvePlanBySlug(admin, planSlug);
  if (!plan || plan.price_cents <= 0) {
    return { error: 'Não foi possível calcular o preço do kit do mês.' };
  }

  const product = buildMonthlyKitProduct(plan, theme);
  const qty = Math.min(Math.max(Math.floor(quantity), 1), product.maxQuantity ?? 9);

  return {
    productId,
    quantity: qty,
    planSlug,
    bundleSubscriptionId: bundleResult,
    themeId: theme.id,
    themeName: theme.name,
    planName: product.planName ?? plan.name,
    priceCents: product.priceCents,
    lineTotalCents: product.priceCents * qty,
  };
}
