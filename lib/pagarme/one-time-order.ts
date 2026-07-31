import { pagarmeRequest } from '@/lib/pagarme/client';
import type { PagarmeBillingAddressInput } from '@/lib/pagarme/subscription-checkout';

export type PagarmeOrderCharge = {
  id?: string;
  status?: string;
  amount?: number;
  last_transaction?: {
    status?: string;
    qr_code?: string;
    qr_code_url?: string;
    expires_at?: string;
  };
};

export type PagarmeOrderResponse = {
  id: string;
  status?: string;
  code?: string;
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

export function isPagarmeChargePending(status?: string | null): boolean {
  const value = status?.trim().toLowerCase();
  return (
    value === 'pending' ||
    value === 'processing' ||
    value === 'authorized' ||
    value === 'waiting_payment'
  );
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

export async function fetchPagarmeOrder(
  orderId: string
): Promise<PagarmeOrderResponse> {
  return pagarmeRequest<PagarmeOrderResponse>(`/orders/${orderId}`);
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
  cardToken: string,
  billingAddress: PagarmeBillingAddressInput
): Record<string, unknown> {
  const address = {
    ...billingAddress,
    country: billingAddress.country ?? 'BR',
  };

  return {
    payment_method: 'credit_card',
    amount: valueCents,
    credit_card: {
      installments: 1,
      operation_type: 'auth_and_capture',
      card_token: cardToken,
      card: {
        billing_address: address,
      },
    },
  };
}

export async function chargePagarmeOneTimeOrder(input: {
  customerId: string;
  valueCents: number;
  description: string;
  cardToken: string;
  billingAddress: PagarmeBillingAddressInput;
  orderCode: string;
  metadata?: Record<string, string>;
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
        input.cardToken,
        input.billingAddress
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
