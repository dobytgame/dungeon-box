import type { SupabaseClient } from '@supabase/supabase-js';
import { getClientIpFromRequest } from '@/lib/asaas/client-ip';
import { getOrCreateAsaasCustomer } from '@/lib/asaas/customer';
import {
  chargeAsaasOneTimePayment,
  createAsaasPixPayment,
} from '@/lib/asaas/one-time-payment';
import {
  isAsaasPaymentConfirmed,
  userFacingStoreCardPaymentError,
} from '@/lib/asaas/payment-status';
import { isAsaasPaymentPending } from '@/lib/asaas/payment-details';
import {
  attachAsaasPaymentToStoreOrder,
  attachPagarmePaymentToStoreOrder,
  approveStoreOrderPaymentById,
  approveStoreOrderPaymentByPagarmeCharge,
  buildStoreOrderExternalReference,
  createPendingStoreOrderPayment,
  findStoreOrderPaymentRowByOrderId,
  markStoreOrderPaymentFailed,
  parseStoreOrderMeta,
  syncStoreOrderPaymentByOrderId,
  type StoreOrderMeta,
} from '@/lib/asaas/store-order-payment';
import { sendCustomStoreOrderPaymentEmail } from '@/lib/email/send-transactional';
import { getOrCreatePagarmeCustomer } from '@/lib/pagarme/customer';
import { userFacingPagarmeError } from '@/lib/pagarme/errors';
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
import type {
  AsaasCreditCardHolderInput,
  AsaasCreditCardInput,
} from '@/lib/asaas/subscription-checkout';
import { getActivePaymentProvider } from '@/lib/payments/provider';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildCustomStoreOrderPayUrl,
  verifyCustomStoreOrderPayToken,
} from '@/lib/store/custom-order-token';
import {
  getStorePaymentConfig,
  isStorePaymentReady,
} from '@/lib/store/payment-config';

export type CustomStoreOrderLineInput = {
  name: string;
  quantity: number;
  unitPriceCents: number;
};

export type CreateCustomStoreOrderInput = {
  userId: string;
  addressId: string;
  items: CustomStoreOrderLineInput[];
  notes?: string | null;
  sendEmail?: boolean;
};

export type CreateCustomStoreOrderResult = {
  paymentId: string;
  orderId: string;
  amountCents: number;
  paymentUrl: string;
  emailSent: boolean;
  customerEmail: string;
  customerName: string | null;
};

export type CustomStoreOrderPublicView = {
  orderId: string;
  amountCents: number;
  items: Array<{
    name: string;
    quantity: number;
    lineTotalCents: number;
  }>;
  notes: string | null;
  shippingLabel: string | null;
  addressSummary: string | null;
  customerName: string | null;
  state: 'approved' | 'pending';
};

export type ChargeCustomStoreOrderInput = {
  token: string;
  paymentMethod: 'pix' | 'credit_card';
  cardToken?: string;
  creditCard?: AsaasCreditCardInput;
  creditCardHolderInfo?: AsaasCreditCardHolderInput;
  remoteIp?: string;
  request?: Request;
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

function buildOrderDescription(items: StoreOrderMeta['items']): string {
  const summary = items
    .map((line) => `${line.quantity}x ${line.name}`)
    .join(', ');
  return `DungeonBox Loja — ${summary}`;
}

async function loadProfileAndAddress(
  admin: SupabaseClient,
  userId: string,
  addressId: string
): Promise<
  | { profile: ProfileRow; address: AddressRow; cpf: string; phone: string }
  | { error: string }
> {
  const { data: profile } = await admin
    .from('profiles')
    .select(
      'id, email, full_name, cpf, phone, asaas_customer_id, pagarme_customer_id'
    )
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.email) {
    return { error: 'Cliente sem e-mail cadastrado.' };
  }

  const cpf = profile.cpf?.replace(/\D/g, '') ?? '';
  if (cpf.length !== 11) {
    return { error: 'Cliente precisa ter CPF cadastrado para cobrar.' };
  }

  const phone = profile.phone?.replace(/\D/g, '') ?? '';
  if (phone.length < 10) {
    return { error: 'Cliente precisa ter telefone cadastrado para cobrar.' };
  }

  const { data: address } = await admin
    .from('addresses')
    .select(
      'recipient, zip_code, street, number, complement, neighborhood, city, state'
    )
    .eq('id', addressId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!address) {
    return { error: 'Endereço de entrega inválido.' };
  }

  return {
    profile: profile as ProfileRow,
    address: address as AddressRow,
    cpf,
    phone,
  };
}

export async function createCustomStoreOrder(
  admin: SupabaseClient,
  input: CreateCustomStoreOrderInput
): Promise<CreateCustomStoreOrderResult | { error: string }> {
  const items = input.items
    .map((item) => ({
      name: item.name.trim(),
      quantity: Math.max(1, Math.floor(item.quantity)),
      unitPriceCents: Math.round(item.unitPriceCents),
    }))
    .filter((item) => item.name.length > 0 && item.unitPriceCents > 0);

  if (items.length === 0) {
    return { error: 'Informe ao menos um item com nome e valor.' };
  }

  const loaded = await loadProfileAndAddress(
    admin,
    input.userId,
    input.addressId
  );
  if ('error' in loaded) return loaded;

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0
  );
  if (subtotalCents <= 0) {
    return { error: 'O valor do pedido precisa ser maior que zero.' };
  }

  const orderId = crypto.randomUUID();
  const notes = input.notes?.trim() || null;
  const gateway =
    (await getActivePaymentProvider()) === 'pagarme' ? 'pagarme' : 'asaas';

  const orderMeta: StoreOrderMeta = {
    type: 'store_order',
    source: 'admin_custom',
    orderId,
    gateway,
    paymentMethod: 'pix',
    items: items.map((item) => ({
      productId: `custom:${crypto.randomUUID()}`,
      kind: 'catalog',
      quantity: item.quantity,
      name: item.name,
      lineTotalCents: item.unitPriceCents * item.quantity,
      priceCents: item.unitPriceCents,
    })),
    addressId: input.addressId,
    bundleSubscriptionId: null,
    shippingMode: 'standalone',
    subtotalCents,
    shippingCents: 0,
    shippingLabel: 'Incluso no valor',
    productionNotes: notes,
    fulfillmentStatus: 'upcoming',
  };

  const pending = await createPendingStoreOrderPayment(admin, {
    userId: input.userId,
    subscriptionId: null,
    amountCents: subtotalCents,
    paymentMethod: 'pix',
    orderMeta,
  });

  if ('error' in pending) {
    return { error: pending.error };
  }

  const paymentUrl = buildCustomStoreOrderPayUrl(orderId);
  let emailSent = false;

  if (input.sendEmail !== false) {
    const sent = await sendCustomStoreOrderPaymentEmail({
      to: loaded.profile.email,
      name: loaded.profile.full_name,
      amountCents: subtotalCents,
      paymentUrl,
      items: orderMeta.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        lineTotalCents: item.lineTotalCents,
      })),
      notes,
    });
    emailSent = sent.sent;
  }

  return {
    paymentId: pending.id,
    orderId,
    amountCents: subtotalCents,
    paymentUrl,
    emailSent,
    customerEmail: loaded.profile.email,
    customerName: loaded.profile.full_name,
  };
}

export async function getCustomStoreOrderByToken(
  token: string
): Promise<CustomStoreOrderPublicView | { error: string; status: number }> {
  const verified = verifyCustomStoreOrderPayToken(token);
  if ('error' in verified) {
    return { error: verified.error, status: 400 };
  }

  const admin = createAdminClient();
  const paymentRow = await findStoreOrderPaymentRowByOrderId(
    admin,
    verified.orderId
  );
  const meta = parseStoreOrderMeta(paymentRow?.status_detail);
  if (!paymentRow || !meta) {
    return { error: 'Pedido não encontrado.', status: 404 };
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, display_name')
    .eq('id', paymentRow.user_id)
    .maybeSingle();

  let summary: string | null = null;
  if (meta.addressId) {
    const { data: address } = await admin
      .from('addresses')
      .select('city, state')
      .eq('id', meta.addressId)
      .maybeSingle();
    if (address?.city && address?.state) {
      summary = `${address.city}/${address.state}`;
    }
  }

  return {
    orderId: meta.orderId,
    amountCents: paymentRow.amount_cents ?? 0,
    items: meta.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
    })),
    notes: meta.productionNotes ?? null,
    shippingLabel: meta.shippingLabel ?? 'Incluso no valor',
    addressSummary: summary,
    customerName:
      (profile?.full_name as string | null) ??
      (profile?.display_name as string | null) ??
      null,
    state: paymentRow.status === 'approved' ? 'approved' : 'pending',
  };
}

async function updatePaymentMethod(
  admin: SupabaseClient,
  paymentId: string,
  meta: StoreOrderMeta,
  paymentMethod: 'pix' | 'credit_card'
) {
  const nextMeta: StoreOrderMeta = { ...meta, paymentMethod };
  await admin
    .from('payments')
    .update({
      payment_method: paymentMethod,
      status_detail: JSON.stringify(nextMeta),
    })
    .eq('id', paymentId);
  return nextMeta;
}

export async function chargeCustomStoreOrder(
  input: ChargeCustomStoreOrderInput
): Promise<
  | { success: true; orderId: string; paymentId: string }
  | {
      pending: true;
      orderId: string;
      paymentId: string;
      pix?: {
        payload: string;
        expirationDate: string;
        encodedImage?: string;
        imageUrl?: string;
      };
      awaitingReview?: boolean;
    }
  | { error: string; status: number }
> {
  if (!(await isStorePaymentReady())) {
    const config = await getStorePaymentConfig();
    return {
      error:
        config.issue ?? 'Pagamentos da loja indisponíveis no gateway ativo.',
      status: 503,
    };
  }

  const verified = verifyCustomStoreOrderPayToken(input.token);
  if ('error' in verified) {
    return { error: verified.error, status: 400 };
  }

  const admin = createAdminClient();
  const paymentRow = await findStoreOrderPaymentRowByOrderId(
    admin,
    verified.orderId
  );
  let meta = parseStoreOrderMeta(paymentRow?.status_detail);
  if (!paymentRow?.user_id || !meta) {
    return { error: 'Pedido não encontrado.', status: 404 };
  }

  if (paymentRow.status === 'approved') {
    return {
      success: true,
      orderId: meta.orderId,
      paymentId: paymentRow.id,
    };
  }

  const loaded = await loadProfileAndAddress(
    admin,
    paymentRow.user_id,
    meta.addressId
  );
  if ('error' in loaded) {
    return { error: loaded.error, status: 422 };
  }

  const synced = await syncStoreOrderPaymentByOrderId(
    admin,
    paymentRow.user_id,
    meta.orderId
  );
  if (synced.state === 'approved') {
    return {
      success: true,
      orderId: meta.orderId,
      paymentId: paymentRow.id,
    };
  }

  if (input.paymentMethod === 'pix' && synced.pix) {
    return {
      pending: true,
      orderId: meta.orderId,
      paymentId: paymentRow.id,
      pix: synced.pix,
    };
  }

  const amountCents = paymentRow.amount_cents ?? 0;
  if (amountCents <= 0) {
    return { error: 'Valor do pedido inválido.', status: 400 };
  }

  meta = await updatePaymentMethod(
    admin,
    paymentRow.id,
    meta,
    input.paymentMethod
  );

  const gateway = meta.gateway ?? 'asaas';
  const externalReference = buildStoreOrderExternalReference(
    paymentRow.user_id,
    meta.orderId
  );
  const description = buildOrderDescription(meta.items);
  const pagarmeOrderCode = buildPagarmeStoreOrderCode(meta.orderId);
  const pagarmeMetadata = {
    store_user_id: paymentRow.user_id,
    store_order_id: meta.orderId,
    external_reference: externalReference,
  };

  try {
    if (gateway === 'pagarme') {
      const pagarmeCustomerId = await getOrCreatePagarmeCustomer(
        admin,
        loaded.profile,
        loaded.address
      );
      const billingAddress = buildPagarmeBillingAddress(loaded.address);

      if (input.paymentMethod === 'pix') {
        const order = await createPagarmePixOrder({
          customerId: pagarmeCustomerId,
          valueCents: amountCents,
          description,
          orderCode: pagarmeOrderCode,
          metadata: pagarmeMetadata,
        });

        const { orderId: pagarmeOrderId, chargeId, chargeStatus } =
          resolvePagarmeOrderChargeIds(order);

        await attachPagarmePaymentToStoreOrder(admin, paymentRow.id, {
          pagarmeOrderId,
          pagarmeChargeId: chargeId,
        });

        if (isPagarmeChargePaid(chargeStatus) && chargeId) {
          await approveStoreOrderPaymentByPagarmeCharge(
            admin,
            chargeId,
            amountCents
          );
          return {
            success: true,
            paymentId: paymentRow.id,
            orderId: meta.orderId,
          };
        }

        const pix = extractPagarmeStorePix(order);
        if (!pix) {
          return { error: 'Não foi possível gerar o PIX.', status: 400 };
        }

        return {
          pending: true,
          paymentId: paymentRow.id,
          orderId: meta.orderId,
          pix,
        };
      }

      if (!input.cardToken) {
        return { error: 'Token do cartão obrigatório.', status: 400 };
      }

      const order = await chargePagarmeOneTimeOrder({
        customerId: pagarmeCustomerId,
        valueCents: amountCents,
        description,
        cardToken: input.cardToken,
        billingAddress,
        orderCode: pagarmeOrderCode,
        metadata: pagarmeMetadata,
      });

      const { orderId: pagarmeOrderId, chargeId, chargeStatus } =
        resolvePagarmeOrderChargeIds(order);
      const approved = isPagarmeChargePaid(chargeStatus);

      await attachPagarmePaymentToStoreOrder(admin, paymentRow.id, {
        pagarmeOrderId,
        pagarmeChargeId: chargeId,
      });

      if (approved && chargeId) {
        await approveStoreOrderPaymentByPagarmeCharge(
          admin,
          chargeId,
          amountCents
        );
        return {
          success: true,
          paymentId: paymentRow.id,
          orderId: meta.orderId,
        };
      }

      if (isPagarmeChargePending(chargeStatus)) {
        return {
          pending: true,
          paymentId: paymentRow.id,
          orderId: meta.orderId,
          awaitingReview: true,
        };
      }

      const decline =
        extractPagarmeDeclineMessage(order) ||
        'Pagamento recusado. Verifique os dados do cartão.';
      await markStoreOrderPaymentFailed(admin, paymentRow.id, decline);
      return { error: decline, status: 400 };
    }

    const asaasCustomerId = await getOrCreateAsaasCustomer(
      admin,
      loaded.profile,
      loaded.address
    );

    if (input.paymentMethod === 'pix') {
      const payment = await createAsaasPixPayment({
        customerId: asaasCustomerId,
        valueCents: amountCents,
        description,
        externalReference,
      });

      await attachAsaasPaymentToStoreOrder(admin, paymentRow.id, payment.id);

      return {
        pending: true,
        paymentId: paymentRow.id,
        orderId: meta.orderId,
        pix: payment.pix,
      };
    }

    if (!input.creditCard) {
      return { error: 'Dados do cartão incompletos.', status: 400 };
    }

    const holderInfo: AsaasCreditCardHolderInput = {
      name:
        loaded.profile.full_name?.trim() ||
        input.creditCardHolderInfo?.name ||
        input.creditCard.holderName,
      email: loaded.profile.email,
      cpfCnpj: loaded.cpf,
      postalCode: loaded.address.zip_code.replace(/\D/g, ''),
      addressNumber: loaded.address.number,
      addressComplement: loaded.address.complement ?? undefined,
      phone: loaded.phone,
    };

    const remoteIp =
      input.remoteIp ??
      (input.request ? getClientIpFromRequest(input.request) : '127.0.0.1');

    const payment = await chargeAsaasOneTimePayment({
      customerId: asaasCustomerId,
      valueCents: amountCents,
      description,
      remoteIp,
      creditCard: input.creditCard,
      creditCardHolderInfo: holderInfo,
      externalReference,
    });

    const approved = isAsaasPaymentConfirmed(payment.status);
    await attachAsaasPaymentToStoreOrder(admin, paymentRow.id, payment.id);

    if (approved) {
      await approveStoreOrderPaymentById(admin, paymentRow.id, amountCents);
      return {
        success: true,
        paymentId: paymentRow.id,
        orderId: meta.orderId,
      };
    }

    if (isAsaasPaymentPending(payment.status)) {
      return {
        pending: true,
        paymentId: paymentRow.id,
        orderId: meta.orderId,
        awaitingReview: true,
      };
    }

    const decline = userFacingStoreCardPaymentError(payment.status);
    await markStoreOrderPaymentFailed(admin, paymentRow.id, decline);
    return { error: decline, status: 400 };
  } catch (error) {
    console.error('[store] custom order charge:', error);
    const message =
      gateway === 'pagarme'
        ? userFacingPagarmeError(error)
        : error instanceof Error
          ? error.message
          : 'Não foi possível processar o pagamento.';
    return { error: message, status: 500 };
  }
}

export async function syncCustomStoreOrderByToken(token: string) {
  const verified = verifyCustomStoreOrderPayToken(token);
  if ('error' in verified) {
    return { error: verified.error, status: 400 as const };
  }

  const admin = createAdminClient();
  const paymentRow = await findStoreOrderPaymentRowByOrderId(
    admin,
    verified.orderId
  );
  if (!paymentRow?.user_id) {
    return { error: 'Pedido não encontrado.', status: 404 as const };
  }

  const result = await syncStoreOrderPaymentByOrderId(
    admin,
    paymentRow.user_id,
    verified.orderId
  );

  if (result.state === 'not_found') {
    return { error: 'Pedido não encontrado.', status: 404 as const };
  }

  return result;
}
