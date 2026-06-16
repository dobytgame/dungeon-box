import { asaasRequest } from '@/lib/asaas/client';
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

export async function chargeAsaasOneTimePayment(input: {
  customerId: string;
  valueCents: number;
  description: string;
  remoteIp: string;
  creditCard: AsaasCreditCardInput;
  creditCardHolderInfo: AsaasCreditCardHolderInput;
  externalReference?: string;
}): Promise<AsaasPaymentResponse> {
  if (input.valueCents <= 0) {
    throw new Error('Valor de cobrança única inválido.');
  }

  return asaasRequest<AsaasPaymentResponse>('/payments', {
    method: 'POST',
    body: {
      customer: input.customerId,
      billingType: 'CREDIT_CARD',
      value: centsToReais(input.valueCents),
      dueDate: formatAsaasDate(new Date()),
      description: input.description,
      externalReference: input.externalReference,
      creditCard: input.creditCard,
      creditCardHolderInfo: input.creditCardHolderInfo,
      remoteIp: input.remoteIp,
    },
  });
}
