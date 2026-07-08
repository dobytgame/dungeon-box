import type { SupabaseClient } from '@supabase/supabase-js';
import { getOrCreateAsaasCustomer } from '@/lib/asaas/customer';
import {
  chargeAsaasOneTimePayment,
  createAsaasPixPayment,
  type AsaasPixQrCode,
} from '@/lib/asaas/one-time-payment';
import { isAsaasPaymentConfirmed } from '@/lib/asaas/payment-status';
import {
  buildStoreOrderExternalReference,
  fulfillApprovedStoreOrder,
  notifyStoreOrderConfirmed,
  type StoreOrderMeta,
} from '@/lib/asaas/store-order-payment';
import type {
  AsaasCreditCardHolderInput,
  AsaasCreditCardInput,
} from '@/lib/asaas/subscription-checkout';
import { subscriptionEligibleForPaintKitAddon } from '@/lib/subscriptions/paint-kit-addon-shared';
import type { CartLine } from '@/lib/store/cart';
import { normalizeCartLines } from '@/lib/store/cart';
import { getStoreProduct, type StoreCatalogProductId } from '@/lib/store/catalog';
import {
  isMonthlyKitProductId,
  resolveMonthlyKitOrderItem,
} from '@/lib/store/monthly-kits';
import { resolveStoreProductForCheckout } from '@/lib/store/resolve-product';
import { isPublicStoreProduct, isStorePublic } from '@/lib/store/access';
import { quoteStoreStandaloneShipping } from '@/lib/store/shipping';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  recordStorePromoRedemption,
  resolveStorePromoCode,
} from '@/lib/store/promo-codes';

type AddressRow = {
  recipient: string;
  zip_code: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  cpf: string | null;
  phone: string | null;
  asaas_customer_id: string | null;
};

type ResolvedStoreLine =
  | {
      kind: 'catalog';
      productId: StoreCatalogProductId;
      quantity: number;
      name: string;
      lineTotalCents: number;
      bundleSubscriptionId: string | null;
    }
  | {
      kind: 'monthly-kit';
      productId: string;
      quantity: number;
      name: string;
      lineTotalCents: number;
      planSlug: string;
      themeId: string;
      themeName: string;
      planName: string;
      priceCents: number;
      originalPriceCents: number;
      bundleSubscriptionId: string | null;
      promoCode?: string;
      promoSummary?: string;
    };

export type StorePaymentMethod = 'credit_card' | 'pix';

export type StoreCheckoutInput = {
  supabase: SupabaseClient;
  userId: string;
  items: CartLine[];
  addressId: string;
  bundleSubscriptionId?: string | null;
  paymentMethod: StorePaymentMethod;
  couponCode?: string | null;
  creditCard?: AsaasCreditCardInput;
  creditCardHolderInfo?: AsaasCreditCardHolderInput;
  remoteIp?: string;
};

export type StoreCheckoutResult =
  | { success: true; paymentId: string; orderId: string }
  | {
      pending: true;
      paymentId: string;
      orderId: string;
      pix?: AsaasPixQrCode;
    }
  | { error: string };

function buildOrderDescription(lines: ResolvedStoreLine[]): string {
  const summary = lines.map((line) => `${line.quantity}x ${line.name}`).join(', ');
  return `DungeonBox Loja — ${summary}`;
}

function findPaintKitForBundle(
  items: CartLine[]
): { productId: StoreCatalogProductId; bumpId: 'amador' | 'profissional' } | null {
  const normalized = normalizeCartLines(items);
  const paintKits = normalized
    .map((line) => {
      const product = getStoreProduct(line.productId);
      if (!product?.paintKitBumpId || line.quantity !== 1) return null;
      return { productId: line.productId as StoreCatalogProductId, bumpId: product.paintKitBumpId };
    })
    .filter(Boolean) as Array<{
    productId: StoreCatalogProductId;
    bumpId: 'amador' | 'profissional';
  }>;

  if (paintKits.length !== 1 || normalized.length !== 1) {
    return null;
  }

  return paintKits[0] ?? null;
}

async function resolveStoreLines(
  supabase: SupabaseClient,
  userId: string,
  items: CartLine[],
  bundleSubscriptionId: string | null
): Promise<ResolvedStoreLine[] | { error: string }> {
  const normalized = normalizeCartLines(items);
  if (normalized.length === 0) {
    return { error: 'Seu carrinho está vazio.' };
  }

  const resolved: ResolvedStoreLine[] = [];
  const admin = createAdminClient();

  for (const line of normalized) {
    if (isMonthlyKitProductId(line.productId)) {
      const monthly = await resolveMonthlyKitOrderItem(
        supabase,
        userId,
        line.productId,
        line.quantity,
        bundleSubscriptionId,
        supabase
      );
      if ('error' in monthly) return monthly;

      resolved.push({
        kind: 'monthly-kit',
        productId: monthly.productId,
        quantity: monthly.quantity,
        name: `Kit do mês — ${monthly.planName}`,
        lineTotalCents: monthly.lineTotalCents,
        planSlug: monthly.planSlug,
        themeId: monthly.themeId,
        themeName: monthly.themeName,
        planName: monthly.planName,
        priceCents: monthly.priceCents,
        originalPriceCents: monthly.originalPriceCents,
        bundleSubscriptionId: monthly.bundleSubscriptionId,
        promoCode: monthly.promoCode,
        promoSummary: monthly.promoSummary,
      });
      continue;
    }

    const product = await resolveStoreProductForCheckout(admin, line.productId);
    if (!product) {
      return { error: 'Produto inválido no carrinho.' };
    }

    if (!isStorePublic() && !isPublicStoreProduct(product)) {
      return { error: 'Este produto não está disponível no momento.' };
    }

    resolved.push({
      kind: 'catalog',
      productId: line.productId as StoreCatalogProductId,
      quantity: line.quantity,
      name: product.name,
      lineTotalCents: product.priceCents * line.quantity,
      bundleSubscriptionId:
        product.paintKitBumpId && bundleSubscriptionId ? bundleSubscriptionId : null,
    });
  }

  const hasBundledMonthlyKit = resolved.some(
    (line) => line.kind === 'monthly-kit' && line.bundleSubscriptionId
  );
  const hasStandaloneCatalog = resolved.some(
    (line) => line.kind === 'catalog' && !line.bundleSubscriptionId
  );

  if (hasBundledMonthlyKit && hasStandaloneCatalog) {
    return {
      error:
        'Kits do mês são enviados junto com a assinatura. Remova itens avulsos ou finalize separadamente.',
    };
  }

  return resolved;
}

export async function purchaseStoreOrder(
  input: StoreCheckoutInput
): Promise<StoreCheckoutResult> {
  const resolvedResult = await resolveStoreLines(
    input.supabase,
    input.userId,
    input.items,
    input.bundleSubscriptionId ?? null
  );

  if ('error' in resolvedResult) {
    return { error: resolvedResult.error };
  }

  const lines = resolvedResult;
  const rawSubtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  if (rawSubtotalCents <= 0) {
    return { error: 'Total inválido.' };
  }

  const hasMonthlyKit = lines.some((line) => line.kind === 'monthly-kit');
  const primaryBundleSubscriptionId =
    lines.find((line) => line.kind === 'monthly-kit' && line.bundleSubscriptionId)
      ?.bundleSubscriptionId ??
    lines.find((line) => line.kind === 'catalog' && line.bundleSubscriptionId)
      ?.bundleSubscriptionId ??
    null;

  const shippingMode: StoreOrderMeta['shippingMode'] = primaryBundleSubscriptionId
    ? 'with_subscription'
    : 'standalone';

  const { data: profile } = await input.supabase
    .from('profiles')
    .select('id, email, full_name, cpf, phone, asaas_customer_id')
    .eq('id', input.userId)
    .single();

  if (!profile?.email) {
    return { error: 'Complete seu perfil antes de comprar.' };
  }

  let addressId = input.addressId;

  if (hasMonthlyKit && primaryBundleSubscriptionId) {
    const { data: subscription } = await input.supabase
      .from('subscriptions')
      .select('id, status, address_id')
      .eq('id', primaryBundleSubscriptionId)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (!subscription) {
      return { error: 'Assinatura inválida para envio do kit do mês.' };
    }

    if (subscription.address_id) {
      addressId = subscription.address_id;
    }
  }

  const { data: address } = await input.supabase
    .from('addresses')
    .select(
      'recipient, zip_code, street, number, complement, neighborhood, city, state'
    )
    .eq('id', addressId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (!address) {
    return { error: 'Endereço de entrega inválido.' };
  }

  if (input.bundleSubscriptionId && !hasMonthlyKit) {
    const paintKitBundle = findPaintKitForBundle(input.items);
    if (!paintKitBundle) {
      return {
        error:
          'Para enviar com a próxima caixa, adicione apenas um kit de pintura ao carrinho.',
      };
    }

    const { data: subscription } = await input.supabase
      .from('subscriptions')
      .select('id, status, special_notes')
      .eq('id', input.bundleSubscriptionId)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (!subscription || !subscriptionEligibleForPaintKitAddon(subscription)) {
      return {
        error:
          'Não foi possível vincular à assinatura. Verifique se ela está ativa e ainda não possui kit de pintura.',
      };
    }
  }

  const profileRow = profile as ProfileRow;
  const addressRow = address as AddressRow;
  const orderId = crypto.randomUUID();
  const now = new Date().toISOString();

  let shippingCents = 0;
  let shippingLabel: string | null = null;

  if (shippingMode === 'standalone') {
    try {
      const quote = quoteStoreStandaloneShipping({
        state: addressRow.state,
        zip_code: addressRow.zip_code,
      });
      shippingCents = quote.cents;
      shippingLabel = quote.label;
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível calcular o frete.',
      };
    }
  }

  let subtotalCents = rawSubtotalCents;
  let couponCode: string | null = null;
  let couponSummary: string | null = null;
  let couponDiscountCents = 0;
  let couponFreeShipping = false;
  let couponPromoId: string | null = null;

  const admin = createAdminClient();

  if (input.couponCode?.trim()) {
    try {
      const promo = await resolveStorePromoCode(
        admin,
        input.couponCode,
        input.userId,
        rawSubtotalCents,
        {
          standaloneShipping: shippingMode === 'standalone',
          shippingCents,
        }
      );
      subtotalCents = promo.discountedSubtotalCents;
      couponCode = promo.promo.code;
      couponSummary = promo.summary;
      couponDiscountCents = promo.subtotalDiscountCents;
      couponFreeShipping = promo.freeShipping;
      couponPromoId = promo.promo.id;

      if (couponFreeShipping) {
        shippingCents = 0;
      }
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : 'Cupom inválido.',
      };
    }
  }

  const totalCents = subtotalCents + shippingCents;

  const asaasCustomerId = await getOrCreateAsaasCustomer(
    input.supabase,
    profileRow,
    addressRow
  );

  const externalReference = buildStoreOrderExternalReference(
    input.userId,
    orderId
  );
  const description = buildOrderDescription(lines);

  const orderMeta: StoreOrderMeta = {
    type: 'store_order',
    orderId,
    paymentMethod: input.paymentMethod,
    items: lines.map((line) =>
      line.kind === 'monthly-kit'
        ? {
            productId: line.productId,
            kind: 'monthly-kit',
            quantity: line.quantity,
            name: line.name,
            lineTotalCents: line.lineTotalCents,
            planSlug: line.planSlug,
            themeId: line.themeId,
            themeName: line.themeName,
            planName: line.planName,
            priceCents: line.priceCents,
            originalPriceCents: line.originalPriceCents,
            bundleSubscriptionId: line.bundleSubscriptionId,
            promoCode: line.promoCode ?? null,
            promoSummary: line.promoSummary ?? null,
          }
        : {
            productId: line.productId,
            kind: 'catalog',
            quantity: line.quantity,
            name: line.name,
            lineTotalCents: line.lineTotalCents,
            bundleSubscriptionId: line.bundleSubscriptionId,
          }
    ),
    addressId,
    bundleSubscriptionId: primaryBundleSubscriptionId,
    shippingMode,
    subtotalCents,
    shippingCents,
    shippingLabel,
    couponCode,
    couponSummary,
    couponDiscountCents,
    couponFreeShipping,
    couponPromoId,
  };

  try {
    if (input.paymentMethod === 'pix') {
      const payment = await createAsaasPixPayment({
        customerId: asaasCustomerId,
        valueCents: totalCents,
        description,
        externalReference,
      });

      const { data: paymentRow, error: paymentError } = await admin
        .from('payments')
        .upsert(
          {
            user_id: input.userId,
            subscription_id: primaryBundleSubscriptionId,
            asaas_payment_id: payment.id,
            amount_cents: totalCents,
            currency: 'BRL',
            status: 'pending',
            status_detail: JSON.stringify(orderMeta),
            paid_at: null,
            payment_method: 'pix',
          },
          { onConflict: 'asaas_payment_id' }
        )
        .select('id')
        .single();

      if (paymentError) {
        console.error('[store] payment record:', paymentError);
      }

      return {
        pending: true,
        paymentId: paymentRow?.id ?? payment.id,
        orderId,
        pix: payment.pix,
      };
    }

    if (
      !input.creditCard ||
      !input.creditCardHolderInfo ||
      !input.remoteIp
    ) {
      return { error: 'Dados do cartão incompletos.' };
    }

    const payment = await chargeAsaasOneTimePayment({
      customerId: asaasCustomerId,
      valueCents: totalCents,
      description,
      remoteIp: input.remoteIp,
      creditCard: input.creditCard,
      creditCardHolderInfo: input.creditCardHolderInfo,
      externalReference,
    });

    const approved = isAsaasPaymentConfirmed(payment.status);
    const paidAt = approved ? now : null;

    const { data: paymentRow, error: paymentError } = await admin
      .from('payments')
      .upsert(
        {
          user_id: input.userId,
          subscription_id: primaryBundleSubscriptionId,
          asaas_payment_id: payment.id,
          amount_cents: totalCents,
          currency: 'BRL',
          status: approved ? 'approved' : 'pending',
          status_detail: JSON.stringify(orderMeta),
          paid_at: paidAt,
          payment_method: 'credit_card',
        },
        { onConflict: 'asaas_payment_id' }
      )
      .select('id')
      .single();

    if (paymentError) {
      console.error('[store] payment record:', paymentError);
    }

    if (!approved) {
      return {
        pending: true,
        paymentId: paymentRow?.id ?? payment.id,
        orderId,
      };
    }

    await fulfillApprovedStoreOrder(admin, input.userId, orderMeta);
    await notifyStoreOrderConfirmed(admin, input.userId, orderMeta, totalCents);

    if (couponPromoId && couponCode) {
      await recordStorePromoRedemption(admin, couponPromoId, input.userId);
    }

    return {
      success: true,
      paymentId: paymentRow?.id ?? payment.id,
      orderId,
    };
  } catch (error) {
    console.error('[store] checkout:', error);
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Não foi possível processar o pagamento.',
    };
  }
}
