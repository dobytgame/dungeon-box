export function trackMetaPurchase(input: {
  value: number;
  contentName: string;
}): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') {
    return;
  }

  if (input.value <= 0 || !input.contentName.trim()) {
    return;
  }

  window.fbq('track', 'Purchase', {
    value: input.value,
    currency: 'BRL',
    content_name: input.contentName.trim(),
    content_type: 'product',
  });
}

export function buildMetaPurchaseFromSubscriptions(
  subscriptions: Array<{
    planName: string | null;
    priceCents: number | null;
  }>
): { value: number; contentName: string } | null {
  const rows = subscriptions.filter(
    (row) => row.planName && row.priceCents != null && row.priceCents > 0
  );

  if (rows.length === 0) return null;

  const value =
    rows.reduce((sum, row) => sum + (row.priceCents ?? 0), 0) / 100;

  const contentName =
    rows.length === 1
      ? rows[0]!.planName!
      : rows.map((row) => row.planName!).join(', ');

  return { value, contentName };
}
