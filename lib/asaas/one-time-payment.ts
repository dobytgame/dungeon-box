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
};

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
  } else if (installmentCount <= COMBO_INTEREST_FREE_MAX) {
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
