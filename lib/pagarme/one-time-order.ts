import { pagarmeRequest } from '@/lib/pagarme/client';
import type { PagarmeBillingAddressInput } from '@/lib/pagarme/subscription-checkout';

export type PagarmeOrderCharge = {
  id?: string;
  status?: string;
  amount?: number;
  card?: {
    id?: string;
  };
  last_transaction?: {
    status?: string;
    qr_code?: string;
    qr_code_url?: string;
    expires_at?: string;
    acquirer_message?: string;
    acquirer_return_code?: string;
    card?: {
      id?: string;
    };
  };
};

export type PagarmeOrderResponse = {
  id: string;
  status?: string;
  code?: string;
  metadata?: Record<string, string>;
  charges?: PagarmeOrderCharge[];
};

export type PagarmeStorePixDetails = {
  payload: string;
  expirationDate: string;
  encodedImage?: string;
  imageUrl?: string;
};

function primaryCharge(order: PagarmeOrderResponse): PagarmeOrderCharge | null {
  return order.charges?.[0] ?? null;
}

export function isPagarmeChargePaid(status?: string | null): boolean {
  const value = status?.trim().toLowerCase();
  return value === 'paid' || value === 'captured';
}

export function isPagarmeChargeFailed(status?: string | null): boolean {
  const value = status?.trim().toLowerCase();
  return (
    value === 'failed' ||
    value === 'not_authorized' ||
    value === 'canceled' ||
    value === 'cancelled' ||
    value === 'chargedback' ||
    value === 'voided'
  );
}

export function isPagarmeChargePending(status?: string | null): boolean {
  const value = status?.trim().toLowerCase();
  return (
    value === 'pending' ||
    value === 'processing' ||
    value === 'authorized' ||
    value === 'waiting_payment'
  );
}

export function extractPagarmeDeclineMessage(
  order: PagarmeOrderResponse
): string | null {
  const tx = primaryCharge(order)?.last_transaction;
  const message = tx?.acquirer_message?.trim() || null;
  if (message) return message;
  return null;
}

/** Garante cobrança aprovada em cartão; lança erro amigável se recusada. */
export function assertPagarmeCreditCardOrderPaid(
  order: PagarmeOrderResponse,
  fallbackMessage = 'Pagamento do cartão recusado.'
): void {
  const ids = resolvePagarmeOrderChargeIds(order);
  if (isPagarmeChargePaid(ids.chargeStatus)) return;

  const decline = extractPagarmeDeclineMessage(order);
  if (
    isPagarmeChargeFailed(ids.chargeStatus) ||
    isPagarmeChargeFailed(ids.orderStatus) ||
    decline
  ) {
    throw new Error(decline || fallbackMessage);
  }

  if (isPagarmeChargePending(ids.chargeStatus)) {
    throw new Error(
      'Pagamento ainda em análise. Aguarde a confirmação ou tente outro cartão.'
    );
  }

  throw new Error(fallbackMessage);
}

export function extractPagarmeStorePix(
  order: PagarmeOrderResponse
): PagarmeStorePixDetails | null {
  const charge = primaryCharge(order);
  const tx = charge?.last_transaction;
  if (!tx?.qr_code) return null;

  return {
    payload: tx.qr_code,
    expirationDate: tx.expires_at ?? '',
    imageUrl: tx.qr_code_url ?? undefined,
  };
}

export async function extractPagarmePixWithRetry(
  order: PagarmeOrderResponse,
  attempts = 4
): Promise<PagarmeStorePixDetails | null> {
  let current = order;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const pix = extractPagarmeStorePix(current);
    if (pix?.payload?.trim()) return pix;

    if (attempt < attempts - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, 350 * (attempt + 1))
      );
      current = await fetchPagarmeOrder(order.id);
    }
  }

  return extractPagarmeStorePix(current);
}

export async function fetchPagarmeOrder(
  orderId: string
): Promise<PagarmeOrderResponse> {
  return pagarmeRequest<PagarmeOrderResponse>(`/orders/${orderId}`);
}

export async function fetchPagarmeCharge(chargeId: string): Promise<{
  id: string;
  status?: string;
  amount?: number;
  code?: string;
  metadata?: Record<string, string>;
}> {
  return pagarmeRequest(`/charges/${chargeId}`);
}

async function createPagarmeOrder(input: {
  customerId: string;
  valueCents: number;
  description: string;
  orderCode: string;
  metadata?: Record<string, string>;
  payments: Array<Record<string, unknown>>;
}) {
  return pagarmeRequest<PagarmeOrderResponse>('/orders', {
    method: 'POST',
    body: {
      customer_id: input.customerId,
      code: input.orderCode,
      metadata: input.metadata,
      items: [
        {
          amount: input.valueCents,
          description: input.description,
          quantity: 1,
          code: input.orderCode,
        },
      ],
      payments: input.payments,
    },
  });
}

function buildCreditCardPayment(
  valueCents: number,
  billingAddress: PagarmeBillingAddressInput,
  card: { cardToken?: string; cardId?: string },
  installments = 1
): Record<string, unknown> {
  const address = {
    ...billingAddress,
    country: billingAddress.country ?? 'BR',
  };

  const creditCard: Record<string, unknown> = {
    installments: Math.max(1, installments),
    operation_type: 'auth_and_capture',
  };

  if (card.cardId) {
    creditCard.card_id = card.cardId;
  } else if (card.cardToken) {
    creditCard.card_token = card.cardToken;
    creditCard.card = {
      billing_address: address,
    };
  } else {
    throw new Error('Informe card_id ou card_token para cobrança no Pagar.me.');
  }

  return {
    payment_method: 'credit_card',
    amount: valueCents,
    credit_card: creditCard,
  };
}

export function extractPagarmeOrderCardId(
  order: PagarmeOrderResponse
): string | null {
  const charge = primaryCharge(order);
  const fromTransaction = charge?.last_transaction?.card?.id?.trim();
  if (fromTransaction) return fromTransaction;

  const fromCharge = charge?.card?.id?.trim();
  if (fromCharge) return fromCharge;

  const fromOrderCard = (
    order as { card?: { id?: string } } | null | undefined
  )?.card?.id?.trim();
  return fromOrderCard || null;
}

export async function resolvePagarmeOrderCardId(
  order: PagarmeOrderResponse
): Promise<string | null> {
  const immediate = extractPagarmeOrderCardId(order);
  if (immediate) return immediate;

  try {
    const fresh = await fetchPagarmeOrder(order.id);
    return extractPagarmeOrderCardId(fresh);
  } catch {
    return null;
  }
}

export async function chargePagarmeOneTimeOrder(input: {
  customerId: string;
  valueCents: number;
  description: string;
  billingAddress: PagarmeBillingAddressInput;
  orderCode: string;
  metadata?: Record<string, string>;
  installments?: number;
  cardToken?: string;
  cardId?: string;
}) {
  return createPagarmeOrder({
    customerId: input.customerId,
    valueCents: input.valueCents,
    description: input.description,
    orderCode: input.orderCode,
    metadata: input.metadata,
    payments: [
      buildCreditCardPayment(
        input.valueCents,
        input.billingAddress,
        { cardToken: input.cardToken, cardId: input.cardId },
        input.installments ?? 1
      ),
    ],
  });
}

export async function createPagarmePixOrder(input: {
  customerId: string;
  valueCents: number;
  description: string;
  orderCode: string;
  metadata?: Record<string, string>;
  expiresInSeconds?: number;
}) {
  return createPagarmeOrder({
    customerId: input.customerId,
    valueCents: input.valueCents,
    description: input.description,
    orderCode: input.orderCode,
    metadata: input.metadata,
    payments: [
      {
        payment_method: 'pix',
        amount: input.valueCents,
        pix: {
          expires_in: input.expiresInSeconds ?? 3600,
        },
      },
    ],
  });
}

export function resolvePagarmeOrderChargeIds(order: PagarmeOrderResponse): {
  orderId: string;
  chargeId: string | null;
  chargeStatus: string | null;
  orderStatus: string | null;
} {
  const charge = primaryCharge(order);
  return {
    orderId: order.id,
    chargeId: charge?.id ?? null,
    chargeStatus: charge?.status ?? charge?.last_transaction?.status ?? null,
    orderStatus: order.status ?? null,
  };
}
