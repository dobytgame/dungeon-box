export function resolvePagarmePublicKey(): string {
  return process.env.NEXT_PUBLIC_PAGARME_PUBLIC_KEY?.trim() ?? '';
}

export const PAGARME_PUBLIC_KEY = resolvePagarmePublicKey();

export const PAGARME_TOKENIZATION_READY = Boolean(PAGARME_PUBLIC_KEY);
