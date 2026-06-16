export const BLOCKING_SUBSCRIPTION_STATUSES = [
  'pending',
  'active',
  'paused',
  'past_due',
] as const;

export type BlockingSubscriptionStatus =
  (typeof BLOCKING_SUBSCRIPTION_STATUSES)[number];
