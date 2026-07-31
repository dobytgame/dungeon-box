export function resolvePagarmeSecretKey(): string {
  return process.env.PAGARME_SECRET_KEY?.trim() ?? '';
}

export const PAGARME_CONFIGURED = Boolean(resolvePagarmeSecretKey());

const BASE_URL = 'https://api.pagar.me/core/v5';

export type PagarmeApiErrorBody = {
  message?: string;
  errors?: Record<string, string[]>;
};

export class PagarmeApiError extends Error {
  readonly status: number;
  readonly body: PagarmeApiErrorBody;

  constructor(message: string, status: number, body: PagarmeApiErrorBody = {}) {
    super(message);
    this.name = 'PagarmeApiError';
    this.status = status;
    this.body = body;
  }
}

type PagarmeRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
};

function authHeader(): Record<string, string> {
  const key = resolvePagarmeSecretKey();
  return {
    Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
    'Content-Type': 'application/json',
  };
}

function formatPagarmeError(body: PagarmeApiErrorBody, status: number): string {
  if (body.message?.trim()) return body.message;
  const entries = Object.entries(body.errors ?? {});
  if (entries.length > 0) {
    const [field, messages] = entries[0]!;
    const detail = messages?.[0];
    if (detail) return `${field}: ${detail}`;
  }
  if (status === 401) return 'Credenciais Pagar.me inválidas.';
  return 'Não foi possível processar o pagamento.';
}

export async function pagarmeRequest<T>(
  path: string,
  options: PagarmeRequestOptions = {}
): Promise<T> {
  if (!PAGARME_CONFIGURED) {
    throw new PagarmeApiError('Pagar.me não configurado.', 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 30_000
  );

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: authHeader(),
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) as PagarmeApiErrorBody & T;

    if (!res.ok) {
      throw new PagarmeApiError(
        formatPagarmeError(data, res.status),
        res.status,
        data
      );
    }

    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}
