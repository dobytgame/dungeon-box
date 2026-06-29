export function subscriptionPurchaseTrackingKey(subscriptionIds: string[]): string {
  const sorted = [...subscriptionIds].sort();
  return `dbx_subscription_purchase_tracked:${sorted.join(',')}`;
}

export function hasTrackedSubscriptionPurchase(subscriptionIds: string[]): boolean {
  if (typeof window === 'undefined' || subscriptionIds.length === 0) return false;
  return (
    sessionStorage.getItem(subscriptionPurchaseTrackingKey(subscriptionIds)) ===
    '1'
  );
}

export function markSubscriptionPurchaseTracked(subscriptionIds: string[]): void {
  if (typeof window === 'undefined' || subscriptionIds.length === 0) return;
  sessionStorage.setItem(subscriptionPurchaseTrackingKey(subscriptionIds), '1');
}
