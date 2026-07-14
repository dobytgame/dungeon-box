import { asaasRequest } from '@/lib/asaas/client';
import {
  COMBO_INTEREST_FREE_MAX,
  COMBO_MAX_INSTALLMENTS,
} from '@/lib/checkout/combo-billing';
import type {
  AsaasCreditCardHolderInput,
  AsaasCreditCardInput,
} from '@/lib/asaas/subscription-checkout';

type AsaasPaymentResponse = {
  id: string;
  status?: string;
  value?: number;
  externalReference?: string | null;
  billingType?: string;
  subscription?: string | { id?: string } | null;
  installment?: string | null;
  installmentNumber?: number | null;
  paymentDate?: string | null;
};

export type AsaasPixQrCode = {
  encodedImage: string;
  payload: string;
  expirationDate: string;
};

export type AsaasPixPaymentResult = AsaasPaymentResponse & {
  pix: AsaasPixQrCode;
};

function formatAsaasDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}

export type ChargeAsaasPaymentInput = {
  customerId: string;
  valueCents: number;
  description: string;
  remoteIp: string;
  creditCard: AsaasCreditCardInput;
  creditCardHolderInfo: AsaasCreditCardHolderInput;
  externalReference?: string;
  installmentCount?: number;
  /** Parcelas até este limite são enviadas sem juros ao Asaas. */
  interestFreeMax?: number;
};

export type CreateAsaasPixPaymentInput = {
  customerId: string;
  valueCents: number;
  description: string;
  externalReference?: string;
};

export async function fetchAsaasPayment(
  paymentId: string
): Promise<AsaasPaymentResponse> {
  return asaasRequest<AsaasPaymentResponse>(`/payments/${paymentId}`);
}

export async function fetchAsaasPixQrCode(
  paymentId: string
): Promise<AsaasPixQrCode> {
  return asaasRequest<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
}

async function fetchAsaasPixQrCodeWithRetry(
  paymentId: string,
  attempts = 4
): Promise<AsaasPixQrCode> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const pix = await fetchAsaasPixQrCode(paymentId);
      if (pix.payload?.trim()) {
        return pix;
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error('Não foi possível gerar o QR Code PIX. Tente novamente.');
}

export async function createAsaasPixPayment(
  input: CreateAsaasPixPaymentInput
): Promise<AsaasPixPaymentResult> {
  if (input.valueCents <= 0) {
    throw new Error('Valor de cobrança PIX inválido.');
  }

  const payment = await asaasRequest<AsaasPaymentResponse>('/payments', {
    method: 'POST',
    body: {
      customer: input.customerId,
      billingType: 'PIX',
      dueDate: formatAsaasDate(new Date()),
      value: centsToReais(input.valueCents),
      description: input.description.slice(0, 500),
      externalReference: input.externalReference,
    },
  });

  const pix = await fetchAsaasPixQrCodeWithRetry(payment.id);

  return {
    ...payment,
    pix,
  };
}

export async function chargeAsaasOneTimePayment(
  input: ChargeAsaasPaymentInput
): Promise<AsaasPaymentResponse> {
  if (input.valueCents <= 0) {
    throw new Error('Valor de cobrança única inválido.');
  }

  const installmentCount = input.installmentCount ?? 1;
  if (installmentCount < 1 || installmentCount > COMBO_MAX_INSTALLMENTS) {
    throw new Error('Número de parcelas inválido.');
  }

  const interestFreeMax = input.interestFreeMax ?? COMBO_INTEREST_FREE_MAX;

  const body: Record<string, unknown> = {
    customer: input.customerId,
    billingType: 'CREDIT_CARD',
    dueDate: formatAsaasDate(new Date()),
    description: input.description,
    externalReference: input.externalReference,
    creditCard: input.creditCard,
    creditCardHolderInfo: input.creditCardHolderInfo,
    remoteIp: input.remoteIp,
  };

  if (installmentCount === 1) {
    body.value = centsToReais(input.valueCents);
  } else if (installmentCount <= interestFreeMax) {
    body.installmentCount = installmentCount;
    body.totalValue = centsToReais(input.valueCents);
  } else {
    body.installmentCount = installmentCount;
    body.totalValue = centsToReais(input.valueCents);
  }

  return asaasRequest<AsaasPaymentResponse>('/payments', {
    method: 'POST',
    body,
  });
}
