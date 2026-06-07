import { randomUUID } from 'crypto';
import type { PreApprovalResponse } from 'mercadopago/dist/clients/preApproval/commonTypes';
import { mpBackUrl, mpRecurringDates } from '@/lib/mercadopago';
import { postPreapproval } from '@/lib/mercadopago/preapproval-api';

export type CreatePreapprovalInput = {
  cardTokenId: string;
  payerEmail: string;
  externalReference: string;
  reason: string;
  transactionAmount: number;
};

export type CreatePreapprovalResult = {
  preApproval: PreApprovalResponse;
};

/**
 * Creates an authorized subscription on MP using the card token from Checkout Bricks.
 * Stays on-site — no hosted MP checkout redirect.
 */
export async function createSubscriptionPreapproval(
  input: CreatePreapprovalInput
): Promise<CreatePreapprovalResult> {
  const { start_date, end_date } = mpRecurringDates();

  const auto_recurring = {
    frequency: 1,
    frequency_type: 'months',
    transaction_amount: Number(input.transactionAmount.toFixed(2)),
    currency_id: 'BRL',
    start_date,
    end_date,
  };

  const preApproval = await postPreapproval(
    {
      reason: input.reason,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      back_url: mpBackUrl('/checkout/success'),
      auto_recurring,
      status: 'authorized',
      card_token_id: input.cardTokenId,
    },
    randomUUID()
  );

  return { preApproval };
}
