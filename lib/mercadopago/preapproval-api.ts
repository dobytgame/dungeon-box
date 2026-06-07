import { randomUUID } from 'crypto';
import type { PreApprovalResponse } from 'mercadopago/dist/clients/preApproval/commonTypes';
import { getMpCredentialMode } from '@/lib/mercadopago/credentials';

const MP_API = 'https://api.mercadopago.com';

export type MpApiError = Error & {
  status?: number;
  error?: string;
  cause?: unknown;
};

function mpApiHeaders(idempotencyKey: string): Record<string, string> {
  const token = process.env.MP_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error('MP_ACCESS_TOKEN não configurado.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Idempotency-Key': idempotencyKey,
  };

  if (getMpCredentialMode(token) === 'test') {
    headers['X-scope'] = 'stage';
  }

  return headers;
}

export async function postPreapproval(
  body: Record<string, unknown>,
  idempotencyKey = randomUUID()
): Promise<PreApprovalResponse> {
  const res = await fetch(`${MP_API}/preapproval`, {
    method: 'POST',
    headers: mpApiHeaders(idempotencyKey),
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as PreApprovalResponse & {
    message?: string;
    error?: string;
    cause?: unknown;
  };

  if (!res.ok) {
    const err = new Error(
      data.message ?? 'Erro ao criar assinatura no Mercado Pago.'
    ) as MpApiError;
    err.status = res.status;
    err.error = data.error;
    err.cause = data.cause;
    throw err;
  }

  return data;
}
