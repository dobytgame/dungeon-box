import { randomUUID } from 'crypto';
import type { PreApprovalResponse } from 'mercadopago/dist/clients/preApproval/commonTypes';
import {
  getPreApprovalClient,
  mpAppUrl,
  mpRecurringDates,
} from '@/lib/mercadopago';
import { isCardTokenNotFoundError, parseMpError } from '@/lib/mercadopago/errors';

export type CreatePreapprovalInput = {
  cardTokenId: string;
  payerEmail: string;
  externalReference: string;
  reason: string;
  transactionAmount: number;
};

export type CreatePreapprovalResult = {
  preApproval: PreApprovalResponse;
  flow: 'authorized' | 'pending_redirect';
};

function isMpInternalError(error: unknown): boolean {
  const parsed = parseMpError(error) as ReturnType<typeof parseMpError> & {
    error?: string;
  };
  const message = parsed.message?.toLowerCase() ?? '';
  return (
    parsed.status === 500 ||
    parsed.error === 'internal_server_error' ||
    message.includes('something went wrong') ||
    message.includes('internal server error')
  );
}

export function getPreapprovalCheckoutUrl(
  preApproval: PreApprovalResponse
): string | undefined {
  const sandbox = (preApproval as { sandbox_init_point?: string })
    .sandbox_init_point;
  return sandbox || preApproval.init_point;
}

/**
 * Creates a subscription on MP. Tries inline authorization with the Brick token;
 * on sandbox failures, falls back to pending + hosted checkout URL.
 */
export async function createSubscriptionPreapproval(
  input: CreatePreapprovalInput
): Promise<CreatePreapprovalResult> {
  const { start_date, end_date } = mpRecurringDates();
  const client = getPreApprovalClient();

  const auto_recurring = {
    frequency: 1,
    frequency_type: 'months',
    transaction_amount: input.transactionAmount,
    currency_id: 'BRL',
    start_date,
    end_date,
  };

  const base = {
    reason: input.reason,
    external_reference: input.externalReference,
    payer_email: input.payerEmail,
    back_url: mpAppUrl('/checkout/success'),
    auto_recurring,
  };

  try {
    const preApproval = await client.create({
      body: {
        ...base,
        status: 'authorized',
        card_token_id: input.cardTokenId,
      },
      requestOptions: { idempotencyKey: randomUUID() },
    });
    return { preApproval, flow: 'authorized' };
  } catch (error) {
    if (!isCardTokenNotFoundError(error) && !isMpInternalError(error)) {
      throw error;
    }
    console.warn(
      '[mp] authorized preapproval failed, using pending checkout:',
      parseMpError(error)
    );
  }

  const preApproval = await client.create({
    body: {
      ...base,
      status: 'pending',
    },
    requestOptions: { idempotencyKey: randomUUID() },
  });

  if (!getPreapprovalCheckoutUrl(preApproval)) {
    throw new Error('Mercado Pago não retornou link para concluir a assinatura.');
  }

  return { preApproval, flow: 'pending_redirect' };
}
