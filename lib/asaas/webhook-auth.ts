export function validateAsaasWebhookToken(headerValue: string | null): boolean {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (!expected) {
    console.warn(
      '[asaas-webhook] ASAAS_WEBHOOK_TOKEN ausente — validação ignorada (apenas dev).'
    );
    return true;
  }
  if (!headerValue) return false;
  return headerValue.trim() === expected;
}
