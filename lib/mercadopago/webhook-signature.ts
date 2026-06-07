import { createHmac, timingSafeEqual } from 'crypto';

/** ID usado no manifest — query `data.id` / `id` tem prioridade sobre o body. */
export function extractNotificationDataId(
  searchParams: URLSearchParams,
  body: { data?: { id?: string | number } } | null
): string | null {
  const fromQuery =
    searchParams.get('data.id') ?? searchParams.get('id');
  if (fromQuery) return normalizeDataId(fromQuery);
  if (body?.data?.id != null) {
    return normalizeDataId(String(body.data.id));
  }
  return null;
}

function normalizeDataId(id: string): string {
  if (/[a-zA-Z]/.test(id)) return id.toLowerCase();
  return id;
}

/**
 * Valida x-signature do Mercado Pago.
 * @see https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks
 */
export function validateMpWebhookSignature(
  dataId: string | null,
  signatureHeader: string | null,
  requestId: string | null
): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.warn(
      '[mp-webhook] MP_WEBHOOK_SECRET ausente — validação ignorada (apenas dev).'
    );
    return true;
  }

  if (!dataId || !signatureHeader || !requestId) {
    return false;
  }

  const parts = signatureHeader.split(',');
  const ts = parts.find((p) => p.trim().startsWith('ts='))?.split('=')[1];
  const v1 = parts.find((p) => p.trim().startsWith('v1='))?.split('=')[1];

  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(v1));
  } catch {
    return false;
  }
}
