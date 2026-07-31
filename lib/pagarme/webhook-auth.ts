import crypto from 'crypto';

export function validatePagarmeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.PAGARME_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.warn('[pagarme-webhook] PAGARME_WEBHOOK_SECRET not set — skipping validation');
    return true;
  }

  if (!signatureHeader) return false;

  const expectedSha1 = crypto
    .createHmac('sha1', secret)
    .update(rawBody)
    .digest('hex');

  const normalized = signatureHeader.replace(/^sha1=/, '');
  if (normalized.length !== expectedSha1.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(normalized),
      Buffer.from(expectedSha1)
    );
  } catch {
    return false;
  }
}
