export const ASAAS_CONFIGURED = Boolean(process.env.ASAAS_API_KEY?.trim());

const DEFAULT_PRODUCTION_URL = 'https://api.asaas.com/v3';
const DEFAULT_SANDBOX_URL = 'https://api-sandbox.asaas.com/v3';

export function getAsaasApiBaseUrl(): string {
  const explicit = process.env.ASAAS_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const env = process.env.ASAAS_ENV?.trim().toLowerCase();
  if (env === 'sandbox') return DEFAULT_SANDBOX_URL;
  if (env === 'production') return DEFAULT_PRODUCTION_URL;

  return DEFAULT_PRODUCTION_URL;
}

export type AsaasApiErrorBody = {
  errors?: Array<{ code?: string; description?: string }>;
};

export class AsaasApiError extends Error {
  readonly status: number;
  readonly errors: Array<{ code?: string; description?: string }>;

  constructor(
    message: string,
    status: number,
    errors: Array<{ code?: string; description?: string }> = []
  ) {
    super(message);
    this.name = 'AsaasApiError';
    this.status = status;
    this.errors = errors;
  }
}

type AsaasRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
};

export async function asaasRequest<T>(
  path: string,
  options: AsaasRequestOptions = {}
): Promise<T> {
  const apiKey = process.env.ASAAS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Asaas não configurado (ASAAS_API_KEY).');
  }

  const baseUrl = getAsaasApiBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const timeoutMs = options.timeoutMs ?? 65_000;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        access_token: apiKey,
        'User-Agent': 'DungeonBox/1.0.0',
      },
      body: options.body != null ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    const parsed = text ? (JSON.parse(text) as T & AsaasApiErrorBody) : ({} as T & AsaasApiErrorBody);

    if (!response.ok) {
      const errors = parsed.errors ?? [];
      const description =
        errors.map((e) => e.description).filter(Boolean).join(' ') ||
        `Erro na API Asaas (${response.status}).`;
      throw new AsaasApiError(description, response.status, errors);
    }

    return parsed as T;
  } catch (error) {
    if (error instanceof AsaasApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        'O pagamento demorou para responder. Verifique sua assinatura antes de tentar de novo.'
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
