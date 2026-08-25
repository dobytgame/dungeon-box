import type { SupabaseClient } from '@supabase/supabase-js';
import { getOrCreateAsaasCustomer } from '@/lib/asaas/customer';
import {
  chargeAsaasOneTimePayment,
  createAsaasPixPayment,
  type AsaasPixQrCode,
} from '@/lib/asaas/one-time-payment';
import {
  isAsaasPaymentConfirmed,
  userFacingStoreCardPaymentError,
} from '@/lib/asaas/payment-status';
import { isAsaasPaymentPending } from '@/lib/asaas/payment-details';
import {
  attachAsaasPaymentToStoreOrder,
  attachPagarmePaymentToStoreOrder,
  approveStoreOrderPaymentByPagarmeCharge,
  buildStoreOrderExternalReference,
  createPendingStoreOrderPayment,
  fulfillApprovedStoreOrder,
  markStoreOrderPaymentFailed,
  notifyStoreOrderConfirmed,
  type StoreOrderMeta,
} from '@/lib/asaas/store-order-payment';
import { notifyAdminStoreOrderPaymentFromPaymentRow } from '@/lib/admin/store-payment-notifications';
import { getOrCreatePagarmeCustomer } from '@/lib/pagarme/customer';
import {
  chargePagarmeOneTimeOrder,
  createPagarmePixOrder,
  extractPagarmeDeclineMessage,
  extractPagarmeStorePix,
  isPagarmeChargePaid,
  isPagarmeChargePending,
  resolvePagarmeOrderChargeIds,
} from '@/lib/pagarme/one-time-order';
import { buildPagarmeStoreOrderCode } from '@/lib/pagarme/store-order-code';
import { userFacingPagarmeError } from '@/lib/pagarme/errors';
import { getActivePaymentProvider } from '@/lib/payments/provider';
import type {
  AsaasCreditCardHolderInput,
  AsaasCreditCardInput,
} from '@/lib/asaas/subscription-checkout';
import { subscriptionEligibleForPaintKitAddon } from '@/lib/subscriptions/paint-kit-addon-shared';
import type { CartLine } from '@/lib/store/cart';
import { canonicalizeCartProductId, normalizeCartLines } from '@/lib/store/cart';
import { getStoreProduct, type StoreCatalogProductId } from '@/lib/store/catalog';
import {
  isMonthlyKitProductId,
  resolveMonthlyKitOrderItem,
} from '@/lib/store/monthly-kits';
import { resolveStoreProductForCheckout } from '@/lib/store/resolve-product';
import { isPublicStoreProduct, isStorePublic } from '@/lib/store/access';
import { quoteStoreStandaloneShipping } from '@/lib/store/shipping';
import { formatProductNameWithVariations, formatVariationSummary, validateSelectedProductOptions } from '@/lib/store/product-variations';
import {
  minQuantityForProduct,
  productRequiresUnitUploads,
  validatePersonalizedLine,
  maxQuantityForProduct,
} from '@/lib/store/personalized-product';
import {
  productUsesVarietyQuantityPool,
  validateVarietyPoolTotal,
} from '@/lib/store/variety-quantity-pool';
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
  pagarme_customer_id: string | null;
};

type ResolvedStoreLine =
  | {
      kind: 'catalog';
      productId: StoreCatalogProductId;
      quantity: number;
      name: string;
      lineTotalCents: number;
      priceCents: number;
      originalPriceCents: number;
      promoCode?: string;
      promoSummary?: string;
      bundleSubscriptionId: string | null;
      selectedOptions?: Record<string, string>;
      itemUploads?: string[];
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
      kitNumber: number;
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
  cardToken?: string;
  remoteIp?: string;
};

export type StoreCheckoutResult =
  | { success: true; paymentId: string; orderId: string }
  | {
      pending: true;
      paymentId: string;
      orderId: string;
      pix?: AsaasPixQrCode | {
        payload: string;
        expirationDate: string;
        encodedImage?: string;
        imageUrl?: string;
      };
      awaitingReview?: boolean;
    }
  | { error: string };

function buildPagarmeBillingAddress(address: AddressRow) {
  return {
    line_1: `${address.number}, ${address.street}, ${address.neighborhood}`,
    line_2: address.complement ?? undefined,
    zip_code: address.zip_code.replace(/\D/g, ''),
    city: address.city,
    state: address.state,
    country: 'BR',
  };
}

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
  const admin = createAdminClient();
  const sanitized: CartLine[] = [];
  const varietyPoolTotals = new Map<
    string,
    { product: NonNullable<Awaited<ReturnType<typeof resolveStoreProductForCheckout>>>; total: number }
  >();

  for (const line of items) {
    const productId =
      canonicalizeCartProductId(line.productId) ?? line.productId.trim();
    if (!productId) continue;

    const product = await resolveStoreProductForCheckout(admin, productId, {
      userId,
      userSupabase: supabase,
    });
    const maxQty = product ? maxQuantityForProduct(product) : 9;
    const minQty = product ? minQuantityForProduct(product) : 1;
    const usesPool = product ? productUsesVarietyQuantityPool(product) : false;
    const qty = usesPool
      ? Math.max(0, Math.floor(line.quantity))
      : Math.min(Math.max(Math.floor(line.quantity), minQty), maxQty);
    if (qty === 0) continue;

    sanitized.push({
      productId,
      quantity: qty,
      ...(line.selectedOptions ? { selectedOptions: line.selectedOptions } : {}),
      ...(line.themeId ? { themeId: line.themeId } : {}),
      ...(line.itemUploads ? { itemUploads: line.itemUploads } : {}),
    });

    if (usesPool && product) {
      const current = varietyPoolTotals.get(productId);
      if (current) {
        current.total += qty;
      } else {
        varietyPoolTotals.set(productId, { product, total: qty });
      }
    }
  }

  for (const { product, total } of Array.from(varietyPoolTotals.values())) {
    const validation = validateVarietyPoolTotal(product, total);
    if (!validation.ok) {
      return { error: validation.error };
    }
  }

  if (sanitized.length === 0) {
    return { error: 'Seu carrinho está vazio.' };
  }

  return resolveStoreLinesWithItems(
    supabase,
    userId,
    sanitized,
    bundleSubscriptionId
  );
}

async function resolveStoreLinesWithItems(
  supabase: SupabaseClient,
  userId: string,
  normalized: CartLine[],
  bundleSubscriptionId: string | null
): Promise<ResolvedStoreLine[] | { error: string }> {
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
        line.themeId,
        supabase
      );
      if ('error' in monthly) return monthly;

      resolved.push({
        kind: 'monthly-kit',
        productId: monthly.productId,
        quantity: monthly.quantity,
        name: monthly.lineName,
        lineTotalCents: monthly.lineTotalCents,
        planSlug: monthly.planSlug,
        themeId: monthly.themeId,
        themeName: monthly.themeName,
        kitNumber: monthly.kitNumber,
        planName: monthly.planName,
        priceCents: monthly.priceCents,
        originalPriceCents: monthly.originalPriceCents,
        bundleSubscriptionId: monthly.bundleSubscriptionId,
        promoCode: monthly.promoCode,
        promoSummary: monthly.promoSummary,
      });
      continue;
    }

    const product = await resolveStoreProductForCheckout(admin, line.productId, {
      userId,
      userSupabase: supabase,
    });
    if (!product) {
      return { error: 'Produto inválido no carrinho.' };
    }

    if (!isStorePublic() && !isPublicStoreProduct(product)) {
      return { error: 'Este produto não está disponível no momento.' };
    }

    const validation = validateSelectedProductOptions(product, line.selectedOptions);
    if (!validation.ok) {
      return { error: validation.error };
    }

    const personalized = validatePersonalizedLine(
      product,
      line.quantity,
      line.itemUploads
    );
    if (!personalized.ok) {
      return { error: personalized.error };
    }

    if (
      !productUsesVarietyQuantityPool(product) &&
      !productRequiresUnitUploads(product)
    ) {
      const minQty = minQuantityForProduct(product);
      if (line.quantity < minQty) {
        return {
          error: `Pedido mínimo de ${minQty} unidades para ${product.name}.`,
        };
      }
    }

    resolved.push({
      kind: 'catalog',
      productId: line.productId as StoreCatalogProductId,
      quantity: line.quantity,
      name: formatProductNameWithVariations(product.name, line.selectedOptions),
      lineTotalCents: product.priceCents * line.quantity,
      priceCents: product.priceCents,
      originalPriceCents: product.originalPriceCents ?? product.priceCents,
      promoCode: product.subscriberDiscount ? 'ASSINANTE' : product.promoCode,
      promoSummary: product.promoSummary,
      bundleSubscriptionId:
        product.paintKitBumpId && bundleSubscriptionId ? bundleSubscriptionId : null,
      ...(line.selectedOptions ? { selectedOptions: line.selectedOptions } : {}),
      ...(line.itemUploads ? { itemUploads: line.itemUploads } : {}),
      ...(line.selectedOptions
        ? { variationSummary: formatVariationSummary(line.selectedOptions) }
        : {}),
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
    .select('id, email, full_name, cpf, phone, asaas_customer_id, pagarme_customer_id')
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

  const externalReference = buildStoreOrderExternalReference(
    input.userId,
    orderId
  );
  const description = buildOrderDescription(lines);

  const gateway =
    (await getActivePaymentProvider()) === 'pagarme' ? 'pagarme' : 'asaas';

  const orderMeta: StoreOrderMeta = {
    type: 'store_order',
    orderId,
    gateway,
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
            kitNumber: line.kitNumber,
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
            ...(line.selectedOptions
              ? {
                  selectedOptions: line.selectedOptions,
                  variationSummary: formatVariationSummary(line.selectedOptions),
                }
              : {}),
            ...(line.itemUploads && line.itemUploads.length > 0
              ? { itemUploads: line.itemUploads }
              : {}),
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
    ...(shippingMode === 'standalone' ? { fulfillmentStatus: 'upcoming' as const } : {}),
  };

  try {
    const pendingPayment = await createPendingStoreOrderPayment(admin, {
      userId: input.userId,
      subscriptionId: primaryBundleSubscriptionId,
      amountCents: totalCents,
      paymentMethod: input.paymentMethod,
      orderMeta,
    });

    if ('error' in pendingPayment) {
      return { error: pendingPayment.error };
    }

    const localPaymentId = pendingPayment.id;
    const gateway = orderMeta.gateway ?? 'asaas';
    const pagarmeOrderCode = buildPagarmeStoreOrderCode(orderId);
    const pagarmeMetadata = {
      store_user_id: input.userId,
      store_order_id: orderId,
      external_reference: externalReference,
    };

    if (gateway === 'pagarme') {
      const pagarmeCustomerId = await getOrCreatePagarmeCustomer(
        input.supabase,
        profileRow,
        addressRow
      );
      const billingAddress = buildPagarmeBillingAddress(addressRow);

      if (input.paymentMethod === 'pix') {
        const order = await createPagarmePixOrder({
          customerId: pagarmeCustomerId,
          valueCents: totalCents,
          description,
          orderCode: pagarmeOrderCode,
          metadata: pagarmeMetadata,
        });

        const { orderId: pagarmeOrderId, chargeId, chargeStatus } =
          resolvePagarmeOrderChargeIds(order);

        await attachPagarmePaymentToStoreOrder(admin, localPaymentId, {
          pagarmeOrderId,
          pagarmeChargeId: chargeId,
        });

        if (isPagarmeChargePaid(chargeStatus) && chargeId) {
          await approveStoreOrderPaymentByPagarmeCharge(
            admin,
            chargeId,
            totalCents
          );
          return { success: true, paymentId: localPaymentId, orderId };
        }

        const pix = extractPagarmeStorePix(order);
        if (!pix) {
          return { error: 'Não foi possível gerar o PIX.' };
        }

        return {
          pending: true,
          paymentId: localPaymentId,
          orderId,
          pix,
        };
      }

      if (!input.cardToken) {
        return { error: 'Dados do cartão incompletos.' };
      }

      const order = await chargePagarmeOneTimeOrder({
        customerId: pagarmeCustomerId,
        valueCents: totalCents,
        description,
        cardToken: input.cardToken,
        billingAddress,
        orderCode: pagarmeOrderCode,
        metadata: pagarmeMetadata,
      });

      const { orderId: pagarmeOrderId, chargeId, chargeStatus } =
        resolvePagarmeOrderChargeIds(order);
      const approved = isPagarmeChargePaid(chargeStatus);

      await attachPagarmePaymentToStoreOrder(admin, localPaymentId, {
        pagarmeOrderId,
        pagarmeChargeId: chargeId,
      });

      if (approved && chargeId) {
        await approveStoreOrderPaymentByPagarmeCharge(
          admin,
          chargeId,
          totalCents
        );
        return {
          success: true,
          paymentId: localPaymentId,
          orderId,
        };
      }

      if (!approved) {
        if (isPagarmeChargePending(chargeStatus)) {
          return {
            pending: true,
            paymentId: localPaymentId,
            orderId,
            awaitingReview: true,
          };
        }

        const decline =
          extractPagarmeDeclineMessage(order) ||
          'Pagamento recusado. Verifique os dados do cartão.';
        await markStoreOrderPaymentFailed(admin, localPaymentId, decline);
        return { error: decline };
      }
    }

    const asaasCustomerId = await getOrCreateAsaasCustomer(
      input.supabase,
      profileRow,
      addressRow
    );

    if (input.paymentMethod === 'pix') {
      const payment = await createAsaasPixPayment({
        customerId: asaasCustomerId,
        valueCents: totalCents,
        description,
        externalReference,
      });

      await attachAsaasPaymentToStoreOrder(admin, localPaymentId, payment.id);

      return {
        pending: true,
        paymentId: localPaymentId,
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

    await attachAsaasPaymentToStoreOrder(admin, localPaymentId, payment.id, {
      status: approved ? 'approved' : 'pending',
      paid_at: paidAt,
    });

    if (!approved) {
      if (input.paymentMethod === 'credit_card') {
        if (isAsaasPaymentPending(payment.status)) {
          return {
            pending: true,
            paymentId: localPaymentId,
            orderId,
            awaitingReview: true,
          };
        }

        await markStoreOrderPaymentFailed(
          admin,
          localPaymentId,
          userFacingStoreCardPaymentError(payment.status)
        );

        return {
          error: userFacingStoreCardPaymentError(payment.status),
        };
      }

      return {
        pending: true,
        paymentId: localPaymentId,
        orderId,
      };
    }

    await fulfillApprovedStoreOrder(admin, input.userId, orderMeta);
    await notifyStoreOrderConfirmed(admin, input.userId, orderMeta, totalCents);

    void notifyAdminStoreOrderPaymentFromPaymentRow(admin, {
      type: 'store_order_payment_approved',
      paymentId: localPaymentId,
      userId: input.userId,
      statusDetail: JSON.stringify(orderMeta),
      amountCents: totalCents,
      paymentMethod: input.paymentMethod,
    }).catch((err) => {
      console.error('[admin] store order approved notification:', err);
    });

    if (couponPromoId && couponCode) {
      await recordStorePromoRedemption(admin, couponPromoId, input.userId);
    }

    return {
      success: true,
      paymentId: localPaymentId,
      orderId,
    };
  } catch (error) {
    console.error('[store] checkout:', error);
    const message =
      orderMeta.gateway === 'pagarme'
        ? userFacingPagarmeError(error)
        : error instanceof Error
          ? error.message
          : 'Não foi possível processar o pagamento.';
    return { error: message };
  }
}
