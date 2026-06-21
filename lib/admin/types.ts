import type {
  Address,
  CycleStatus,
  Payment,
  Plan,
  Profile,
  Subscription,
  SubscriptionCycle,
  SubscriptionStatus,
} from '@/lib/dashboard/types';

export interface AdminDashboardStats {
  mrrCents: number;
  activeSubscribers: number;
  newSubscribers30d: number;
  cancelled30d: number;
  cyclesPreparing: number;
  cyclesPendingShip: number;
  pastDueCount: number;
  pendingSubscriptions: number;
  paymentsApproved30d: number;
  revenueApproved30dCents: number;
  mrrByPlan: { planName: string; subscribers: number; mrrCents: number }[];
  recentPayments: Payment[];
  shipQueue: AdminCycleRow[];
  userPlanStats: AdminUserPlanStats;
}

export interface AdminUserPlanStats {
  totalProfiles: number;
  withActivePlan: number;
  withoutActivePlan: number;
}

export type MarketingAudience =
  | 'all_profiles'
  | 'active_subscribers'
  | 'inactive_users'
  | 'newsletter_leads'
  | 'admin_test';

export interface MarketingCopyPreset {
  id: string;
  label: string;
  subject: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface AdminCustomerRow {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
  cpf: string | null;
  created_at: string | null;
  activeSubscriptions: number;
  latestStatus: SubscriptionStatus | null;
}

export interface AdminSubscriptionRow {
  id: string;
  user_id: string;
  status: SubscriptionStatus;
  current_cycle: number | null;
  next_billing_date: string | null;
  started_at: string | null;
  asaas_subscription_id: string | null;
  stripe_subscription_id: string | null;
  promo_code: string | null;
  customerName: string | null;
  customerEmail: string | null;
  planName: string | null;
  planSlug: string | null;
}

export interface AdminCycleRow {
  id: string;
  subscription_id: string;
  cycle_number: number;
  status: CycleStatus;
  tracking_code: string | null;
  carrier: string | null;
  shipped_at: string | null;
  customerName: string | null;
  customerEmail: string | null;
  planName: string | null;
  themeName: string | null;
  city: string | null;
  state: string | null;
}

export interface AdminPaymentRow extends Payment {
  customerName: string | null;
  customerEmail: string | null;
  planName: string | null;
}

export interface AdminCustomerDetail {
  profile: Profile;
  addresses: Address[];
  subscriptions: Subscription[];
  payments: Payment[];
  cycles: SubscriptionCycle[];
}

export type AdminListFilters = {
  q?: string;
  status?: string;
  limit?: number;
};

export interface AdminPlanRow extends Plan {
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
}

export interface AdminPromoCodeRow {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed' | 'free_shipping';
  discount_value: number;
  includes_free_shipping: boolean;
  max_redemptions: number | null;
  times_redeemed: number;
  expires_at: string | null;
  active: boolean;
  plan_slugs: string[] | null;
  created_at: string;
}

export interface AdminPromoRedemptionRow {
  id: string;
  user_id: string;
  subscription_id: string | null;
  created_at: string;
  customerEmail: string | null;
  customerName: string | null;
}

export interface AdminAuditRow {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  actorName: string | null;
  actorEmail: string | null;
}
