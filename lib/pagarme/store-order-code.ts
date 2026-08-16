const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseLegacyStoreReference(
  code?: string | null
): { orderId: string; userId: string } | null {
  if (!code?.startsWith('store:')) return null;

  const parts = code.split(':');
  if (parts.length !== 3) return null;

  const userId = parts[1]?.trim();
  const orderId = parts[2]?.trim();
  if (!userId || !orderId) return null;

  return { userId, orderId };
}

/** Código aceito pela API Pagar.me (sem ":" e caracteres especiais). */
export function buildPagarmeStoreOrderCode(orderId: string): string {
  return orderId;
}

export function buildPagarmeSubscriptionOneTimeCode(subscriptionId: string): string {
  return `${subscriptionId}-one-time`;
}

export function buildPagarmeSubscriptionComboCode(subscriptionId: string): string {
  return `${subscriptionId}-combo`;
}

export function buildPagarmeSubscriptionComboTierCode(
  subscriptionId: string
): string {
  return `${subscriptionId}-combo-tier`;
}

/** Código único para PIX avulso (ativação/renovação admin). */
export function buildPagarmeSubscriptionPixCode(
  subscriptionId: string,
  kind: 'pix' | 'combo' = 'pix'
): string {
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  return `${subscriptionId}-${kind}-${unique}`;
}

export function parsePagarmeSubscriptionComboCode(
  code?: string | null
): string | null {
  if (parsePagarmeSubscriptionComboTierCode(code)) return null;

  const trimmed = code?.trim() ?? '';
  const match = trimmed.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-combo(?:-[a-z0-9]+)?$/i
  );
  return match?.[1] ?? null;
}

export function parsePagarmeSubscriptionComboTierCode(
  code?: string | null
): string | null {
  const trimmed = code?.trim() ?? '';
  const match = trimmed.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-combo-tier(?:-[a-z0-9]+)?$/i
  );
  return match?.[1] ?? null;
}

export function parsePagarmeStoreOrderCode(
  code?: string | null
): { orderId: string; userId?: string } | null {
  const legacy = parseLegacyStoreReference(code);
  if (legacy) return legacy;

  const trimmed = code?.trim() ?? '';
  if (UUID_RE.test(trimmed)) {
    return { orderId: trimmed };
  }

  return null;
}
