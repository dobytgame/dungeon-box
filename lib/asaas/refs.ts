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
