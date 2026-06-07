import { randomUUID } from 'crypto';
import type { PreApprovalResponse } from 'mercadopago/dist/clients/preApproval/commonTypes';
import { getMpCredentialMode } from '@/lib/mercadopago/credentials';

export type MpPreapprovalStatus = 'authorized' | 'paused' | 'cancelled' | 'pending';

const MP_API = 'https://api.mercadopago.com';
const RETRYABLE_STATUSES = new Set([502, 503, 504]);

export type MpApiError = Error & {
  status?: number;
  error?: string;
  cause?: unknown;
  mpResponse?: unknown;
};

type MpErrorPayload = {
  message?: string;
  error?: string;
  status?: number;
  cause?: Array<{ code?: string; description?: string }>;
};

function getAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error('MP_ACCESS_TOKEN não configurado.');
  }
  return token;
}

function mpApiHeaders(
  idempotencyKey?: string,
  extra: Record<string, string> = {}
): Record<string, string> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    ...extra,
  };

  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey;
  }

  if (getMpCredentialMode(token) === 'test') {
    headers['X-scope'] = 'stage';
  }

  return headers;
}

export function extractMpErrorMessage(
  data: unknown,
  httpStatus: number,
  rawBody: string
): string {
  if (data && typeof data === 'object') {
    const payload = data as MpErrorPayload;
    if (payload.message?.trim()) return payload.message.trim();

    const cause = payload.cause?.find(
      (item) => item.description?.trim() || item.code?.trim()
    );
    if (cause?.description?.trim()) return cause.description.trim();
    if (cause?.code?.trim()) return `Mercado Pago: ${cause.code.trim()}`;

    if (payload.error?.trim()) return payload.error.trim();
  }

  const trimmed = rawBody.trim();
  if (trimmed && trimmed.length <= 400 && !trimmed.startsWith('<')) {
    return trimmed;
  }

  return `Mercado Pago retornou HTTP ${httpStatus}.`;
}

function buildMpApiError(
  data: unknown,
  httpStatus: number,
  rawBody: string
): MpApiError {
  const payload = (data && typeof data === 'object' ? data : {}) as MpErrorPayload;
  const err = new Error(extractMpErrorMessage(data, httpStatus, rawBody)) as MpApiError;
  err.status = httpStatus;
  err.error = payload.error;
  err.cause = payload.cause;
  err.mpResponse = data;
  return err;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function mpRequest<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string },
  options?: { retries?: number }
): Promise<T> {
  const retries = options?.retries ?? 1;
  const url = `${MP_API}${path}`;
  let lastError: MpApiError | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const { idempotencyKey, ...fetchInit } = init;
    const res = await fetch(url, {
      ...fetchInit,
      headers: mpApiHeaders(idempotencyKey, fetchInit.headers as Record<string, string>),
    });

    const rawBody = await res.text();
    let data: unknown = {};
    if (rawBody) {
      try {
        data = JSON.parse(rawBody);
      } catch {
        data = { message: rawBody };
      }
    }

    if (res.ok) {
      return data as T;
    }

    lastError = buildMpApiError(data, res.status, rawBody);
    console.error('[mp] API error', {
      method: fetchInit.method ?? 'GET',
      path,
      status: res.status,
      attempt: attempt + 1,
      message: lastError.message,
      error: lastError.error,
      cause: lastError.cause,
    });

    if (!RETRYABLE_STATUSES.has(res.status) || attempt >= retries) {
      throw lastError;
    }

    await sleep(800 * (attempt + 1));
  }

  throw lastError ?? new Error('Erro ao comunicar com o Mercado Pago.');
}

export async function getPreapproval(
  id: string
): Promise<PreApprovalResponse | null> {
  try {
    return await mpRequest<PreApprovalResponse>(`/preapproval/${id}`, {
      method: 'GET',
    });
  } catch (error) {
    const mpError = error as MpApiError;
    if (mpError.status === 404) return null;
    throw error;
  }
}

export async function putPreapprovalStatus(
  id: string,
  status: MpPreapprovalStatus
): Promise<PreApprovalResponse> {
  return mpRequest<PreApprovalResponse>(`/preapproval/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function postPreapproval(
  body: Record<string, unknown>,
  idempotencyKey = randomUUID()
): Promise<PreApprovalResponse> {
  const safeLog = {
    ...body,
    card_token_id: body.card_token_id ? '[redacted]' : undefined,
  };
  console.info('[mp] creating preapproval', safeLog);

  return mpRequest<PreApprovalResponse>(
    '/preapproval',
    {
      method: 'POST',
      idempotencyKey,
      body: JSON.stringify(body),
    },
    { retries: 2 }
  );
}
