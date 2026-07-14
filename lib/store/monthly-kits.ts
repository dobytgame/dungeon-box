import type { SupabaseClient } from '@supabase/supabase-js';
import { PLAN_SLUGS, type PlanSlug } from '@/lib/checkout/plans';
import { campaignMonths } from '@/lib/campaign-calendar';
import { relOne } from '@/lib/dashboard/format';
import type { Subscription, Theme } from '@/lib/dashboard/types';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  loadActiveMonthlyKitStoreProductsMap,
  type MonthlyKitStoreProductConfig,
} from '@/lib/admin/store-products';
import {
  filterStoreProductsByVisibleCategory,
  isStoreProductVisibleInVitrine,
  loadStoreCategoryVisibilityContext,
} from '@/lib/store/category-visibility';
import type { StoreProduct } from '@/lib/store/catalog';
import { resolveBestSubscriptionPromoForStorePlan } from '@/lib/store/subscription-promo';
import {
  normalizeStoreGalleryUrls,
  resolveStoreProductPrimaryImageUrl,
} from '@/lib/store/product-media';

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

async function fetchPlanNamesBySlug(
  admin: SupabaseClient,
  planSlugs: string[]
): Promise<Map<string, string>> {
  if (planSlugs.length === 0) return new Map();

  const { data, error } = await admin
    .from('plans')
    .select('slug, name')
    .in('slug', planSlugs);

  if (error) {
    console.error('[store] fetchPlanNamesBySlug:', error.message);
    return new Map();
  }

  return new Map(
    (data ?? []).map((row) => [row.slug as string, row.name as string])
  );
}

async function loadActiveMonthlyKitStoreRows(
  admin: SupabaseClient
): Promise<MonthlyKitStoreProductConfig[]> {
  const storeProductsByPlan = await loadActiveMonthlyKitStoreProductsMap(admin);
  return Array.from(storeProductsByPlan.values());
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

function buildMonthlyKitIncludes(
  storeRow: MonthlyKitStoreProductConfig,
  theme: Theme,
  bundledWithSubscription: boolean
): string[] {
  const themeLine = bundledWithSubscription
    ? `Tema: ${theme.name}`
    : `Tema do mês: ${theme.name}`;
  const shippingLine = bundledWithSubscription
    ? 'Enviado junto com sua próxima caixa — sem frete'
    : 'Compra avulsa — frete calculado no checkout';

  if (storeRow.includes.length > 0) {
    return [...storeRow.includes, themeLine, shippingLine];
  }

  return [
    `Conteúdo do kit ${storeRow.name}`,
    themeLine,
    shippingLine,
  ];
}

function buildMonthlyKitProduct(
  storeRow: MonthlyKitStoreProductConfig,
  theme: Theme,
  planName: string,
  options?: { bundledWithSubscription?: boolean }
): StoreProduct | null {
  const bundledWithSubscription = options?.bundledWithSubscription ?? true;
  const planSlug = storeRow.plan_slug as PlanSlug;

  if (!planSlug || storeRow.price_cents <= 0) return null;

  const galleryUrls = normalizeStoreGalleryUrls(storeRow.gallery_urls);
  const imageUrl = resolveStoreProductPrimaryImageUrl(
    storeRow.image_url,
    storeRow.gallery_urls
  );

  return {
    id: monthlyKitProductId(planSlug),
    slug: storeRow.slug,
    name: storeRow.name,
    tagline: storeRow.tagline?.trim() || `Kit do tema ${theme.name}`,
    priceCents: storeRow.price_cents,
    priceLabel: formatPriceLabel(storeRow.price_cents),
    includes: buildMonthlyKitIncludes(storeRow, theme, bundledWithSubscription),
    category: 'monthly-kit',
    storeCategorySlug: storeRow.store_category_slug ?? 'kits-mes',
    storeCategoryName: storeRow.store_category_name ?? 'Kits do mês',
    storeCategoryId: storeRow.store_category_id ?? undefined,
    imageUrl,
    galleryUrls: galleryUrls.length ? galleryUrls : undefined,
    pageContentHtml: storeRow.page_content_html ?? undefined,
    subscriberOnly: bundledWithSubscription,
    requiresSubscriptionBundle: bundledWithSubscription,
    themeId: theme.id,
    themeName: theme.name,
    themeEmoji: theme.emoji,
    planName,
    planSlug,
    featured: storeRow.featured,
    maxQuantity: storeRow.max_quantity,
  };
}

async function buildMonthlyKitProductsFromStore(
  admin: SupabaseClient,
  theme: Theme,
  options?: { bundledWithSubscription?: boolean }
): Promise<StoreProduct[]> {
  const storeRows = await loadActiveMonthlyKitStoreRows(admin);
  if (storeRows.length === 0) return [];

  const planNames = await fetchPlanNamesBySlug(
    admin,
    storeRows.map((row) => row.plan_slug)
  );

  return storeRows.flatMap((storeRow) => {
    const planName = planNames.get(storeRow.plan_slug) ?? storeRow.plan_slug;
    const product = buildMonthlyKitProduct(storeRow, theme, planName, options);
    return product ? [product] : [];
  });
}

async function applySubscriptionPromoToProduct(
  admin: SupabaseClient,
  product: StoreProduct,
  subscriptions: Subscription[]
): Promise<StoreProduct> {
  const planSlug = product.planSlug as PlanSlug | undefined;
  if (!planSlug) return product;

  const promo = await resolveBestSubscriptionPromoForStorePlan(
    admin,
    planSlug,
    product.priceCents,
    subscriptions.map((subscription) => ({
      id: subscription.id,
      promo_code: subscription.promo_code ?? null,
    }))
  );

  if (!promo) return product;

  return {
    ...product,
    originalPriceCents: product.priceCents,
    priceCents: promo.discountedPriceCents,
    priceLabel: formatPriceLabel(promo.discountedPriceCents),
    promoCode: promo.promoCode,
    promoSummary: promo.summary,
  };
}

async function applySubscriptionPromosToProducts(
  admin: SupabaseClient,
  products: StoreProduct[],
  subscriptions: Subscription[]
): Promise<StoreProduct[]> {
  return Promise.all(
    products.map((product) =>
      applySubscriptionPromoToProduct(admin, product, subscriptions)
    )
  );
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

  const baseProducts = await buildMonthlyKitProductsFromStore(admin, theme, {
    bundledWithSubscription: true,
  });
  const products = await applySubscriptionPromosToProducts(
    admin,
    baseProducts,
    subscriptions
  );
  const context = await loadStoreCategoryVisibilityContext(admin);
  const visibleProducts = filterStoreProductsByVisibleCategory(products, context);

  if (visibleProducts.length === 0) {
    return {
      products: [],
      hasEligibleSubscription: true,
      hasTheme: true,
      issue: 'no_plan',
    };
  }

  return {
    products: visibleProducts,
    hasEligibleSubscription: true,
    hasTheme: true,
  };
}

export async function getPublicMonthlyKitProducts(
  admin: SupabaseClient
): Promise<StoreProduct[]> {
  const theme = await getCurrentMonthlyTheme(admin, []);
  if (!theme) return [];

  const products = await buildMonthlyKitProductsFromStore(admin, theme, {
    bundledWithSubscription: false,
  });
  const context = await loadStoreCategoryVisibilityContext(admin);
  return filterStoreProductsByVisibleCategory(products, context);
}

export async function resolveStoreMonthlyKitBySlug(
  admin: SupabaseClient,
  slug: string,
  options?: { bundledWithSubscription?: boolean }
): Promise<StoreProduct | null> {
  const storeProductsByPlan = await loadActiveMonthlyKitStoreProductsMap(admin);
  const storeRow = Array.from(storeProductsByPlan.values()).find(
    (row) => row.slug === slug
  );
  if (!storeRow) return null;

  const theme = await getCurrentMonthlyTheme(admin, []);
  if (!theme) return null;

  const planNames = await fetchPlanNamesBySlug(admin, [storeRow.plan_slug]);
  const planName = planNames.get(storeRow.plan_slug) ?? storeRow.plan_slug;

  const product = buildMonthlyKitProduct(storeRow, theme, planName, {
    bundledWithSubscription: options?.bundledWithSubscription ?? false,
  });
  if (!product) return null;

  const context = await loadStoreCategoryVisibilityContext(admin);
  return isStoreProductVisibleInVitrine(product, context) ? product : null;
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
  bundleSubscriptionId: string | null;
  themeId: string;
  themeName: string;
  planName: string;
  priceCents: number;
  originalPriceCents: number;
  lineTotalCents: number;
  promoCode?: string;
  promoSummary?: string;
};

async function resolveMonthlyKitBundleSubscription(
  admin: SupabaseClient,
  userId: string,
  bundleSubscriptionId: string | null,
  requireBundle: boolean,
  fallback?: SupabaseClient
): Promise<string | null | { error: string }> {
  const subscriptions = await fetchEligibleSubscriptions(admin, userId, fallback);

  if (bundleSubscriptionId) {
    const match = subscriptions.find((sub) => sub.id === bundleSubscriptionId);
    if (!match) {
      return { error: 'Assinatura selecionada para envio é inválida.' };
    }
    return bundleSubscriptionId;
  }

  if (!requireBundle) {
    return null;
  }

  if (subscriptions.length === 0) {
    return { error: 'Assinatura ativa necessária para comprar kits do mês.' };
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
  const storeProductsByPlan = await loadActiveMonthlyKitStoreProductsMap(admin);
  const storeRow = storeProductsByPlan.get(planSlug) ?? null;

  if (!storeRow) {
    return { error: 'Kit do mês indisponível na loja.' };
  }

  const theme = await getCurrentMonthlyTheme(
    admin,
    await fetchEligibleSubscriptions(admin, userId, userSupabase ?? supabase)
  );
  if (!theme) {
    return { error: 'Nenhum tema do mês disponível para compra no momento.' };
  }

  const requireBundle = Boolean(bundleSubscriptionId);

  const bundleResult = await resolveMonthlyKitBundleSubscription(
    admin,
    userId,
    bundleSubscriptionId,
    requireBundle,
    userSupabase ?? supabase
  );

  if (typeof bundleResult !== 'string' && bundleResult !== null) {
    return bundleResult;
  }

  const subscriptions = await fetchEligibleSubscriptions(
    admin,
    userId,
    userSupabase ?? supabase
  );

  const planNames = await fetchPlanNamesBySlug(admin, [storeRow.plan_slug]);
  const planName = planNames.get(storeRow.plan_slug) ?? storeRow.plan_slug;

  const product = buildMonthlyKitProduct(storeRow, theme, planName, {
    bundledWithSubscription: requireBundle,
  });
  if (!product) {
    return { error: 'Não foi possível calcular o preço do kit do mês.' };
  }
  const qty = Math.min(Math.max(Math.floor(quantity), 1), product.maxQuantity ?? 9);
  const pricedProduct = requireBundle
    ? await applySubscriptionPromoToProduct(admin, product, subscriptions)
    : product;
  const unitPrice = pricedProduct.priceCents;

  return {
    productId,
    quantity: qty,
    planSlug,
    bundleSubscriptionId: bundleResult,
    themeId: theme.id,
    themeName: theme.name,
    planName: pricedProduct.planName ?? planName,
    priceCents: unitPrice,
    originalPriceCents: pricedProduct.originalPriceCents ?? unitPrice,
    lineTotalCents: unitPrice * qty,
    promoCode: pricedProduct.promoCode,
    promoSummary: pricedProduct.promoSummary,
  };
}
