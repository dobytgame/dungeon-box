export function normalizeAsaasSubscriptionRef(
  value: string | { id?: string } | null | undefined
): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'object' && typeof value.id === 'string') {
    return value.id.trim() || null;
  }
  return null;
}

const SUBSCRIPTION_REF_SUFFIXES = [':combo', ':one-time'] as const;

/** Extrai o ID local da assinatura a partir de externalReference do Asaas. */
export function parseSubscriptionExternalReference(
  externalReference?: string | null
): string | null {
  if (!externalReference?.trim()) return null;

  const ref = externalReference.trim();
  for (const suffix of SUBSCRIPTION_REF_SUFFIXES) {
    if (ref.endsWith(suffix)) {
      const id = ref.slice(0, -suffix.length);
      return id.length > 0 ? id : null;
    }
  }

  return ref;
}

export function isComboExternalReference(
  externalReference?: string | null
): boolean {
  return Boolean(externalReference?.trim().endsWith(':combo'));
}

export function isPaintKitExternalReference(
  externalReference?: string | null
): boolean {
  return Boolean(externalReference?.includes(':paint-kit:'));
}

export function isOneTimeCheckoutExternalReference(
  externalReference?: string | null
): boolean {
  return Boolean(externalReference?.trim().endsWith(':one-time'));
}
