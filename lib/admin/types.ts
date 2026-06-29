import type { CycleShipmentItemKind } from '@/lib/admin/cycle-shipment-items';
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

export interface AdminActivePlanCount {
  planName: string;
  planSlug: string;
  subscribers: number;
}

export interface AdminCustomerReferralAttribution {
  referrerId: string;
  referrerName: string | null;
  referrerEmail: string | null;
  referralCode: string | null;
  status: string;
  createdAt: string | null;
}

export interface AdminReferrerLeaderboardRow {
  userId: string;
  name: string | null;
  email: string | null;
  code: string;
  totalVisits: number;
  totalReferrals: number;
  totalConversions: number;
  pendingCount: number;
  qualifiedCount: number;
}

export interface AdminPartnerReferralStats {
  totalAttributedCustomers: number;
  qualifiedCustomers: number;
  pendingCustomers: number;
  totalLinkVisits: number;
  activeReferrers: number;
  topReferrers: AdminReferrerLeaderboardRow[];
}

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
  activePlanCounts: AdminActivePlanCount[];
  recentPayments: AdminPaymentRow[];
  shipQueue: AdminCycleRow[];
  userPlanStats: AdminUserPlanStats;
  partnerReferralStats: AdminPartnerReferralStats;
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

export type MarketingTemplateId = 'unconverted_lead';

export interface MarketingCopyPreset {
  id: string;
  label: string;
  subject: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  template?: MarketingTemplateId;
  defaultAudience?: MarketingAudience;
}

export interface MarketingRecipient {
  email: string;
  name: string | null;
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
  isPartner: boolean;
  comboTerms: Array<'combo_3' | 'combo_6' | 'combo_12'>;
  referralAttribution: AdminCustomerReferralAttribution | null;
}

export interface AdminPartnerRow {
  id: string;
  user_id: string;
  status: SubscriptionStatus;
  current_cycle: number | null;
  started_at: string | null;
  customerName: string | null;
  customerEmail: string | null;
  planName: string | null;
  planSlug: string | null;
}

export interface AdminSubscriptionRow {
  id: string;
  user_id: string;
  status: SubscriptionStatus;
  current_cycle: number | null;
  next_billing_date: string | null;
  started_at: string | null;
  asaas_subscription_id: string | null;
  asaas_customer_id: string | null;
  stripe_subscription_id: string | null;
  promo_code: string | null;
  customerName: string | null;
  customerEmail: string | null;
  planName: string | null;
  planSlug: string | null;
  billingTerm: string | null;
  comboTotalCents: number | null;
  comboInstallments: number | null;
  prepaidUntil: string | null;
}

export interface AdminCycleBundledTag {
  tag: string;
  kind: CycleShipmentItemKind;
}

export interface AdminCycleExtraItem {
  id: string;
  name: string;
  quantity: number;
  tag: string;
  kind: CycleShipmentItemKind;
  source: 'subscription' | 'store_order';
  paymentPending?: boolean;
}

export interface AdminCycleRow {
  id: string;
  subscription_id: string;
  cycle_number: number;
  status: CycleStatus;
  tracking_code: string | null;
  carrier: string | null;
  shipped_at: string | null;
  paid_at: string | null;
  created_at: string | null;
  customerName: string | null;
  customerEmail: string | null;
  planName: string | null;
  themeName: string | null;
  city: string | null;
  state: string | null;
  isPartner: boolean;
  hasBundledItems: boolean;
  bundledItemTags: AdminCycleBundledTag[];
  /** Itens da loja + add-ons para montar junto com a caixa */
  extraItems: AdminCycleExtraItem[];
}

export interface AdminPaymentRow extends Payment {
  customerName: string | null;
  customerEmail: string | null;
  planName: string | null;
  effectiveAmountCents: number;
  installmentCount: number | null;
  comboLabel: string | null;
}

export interface AdminCustomerDetail {
  profile: Profile;
  addresses: Address[];
  subscriptions: Subscription[];
  payments: Payment[];
  cycles: SubscriptionCycle[];
  referralAttribution: AdminCustomerReferralAttribution | null;
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

export type AdminFinancialPeriod = '30d' | '90d' | 'year' | 'all';

export type FinancialExpenseStatus = 'pending' | 'paid' | 'cancelled';

export interface AdminFinancialCategoryRow {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface AdminFinancialExpenseRow {
  id: string;
  categoryId: string;
  categoryName: string;
  description: string;
  amount_cents: number;
  expense_date: string;
  paid_at: string | null;
  status: FinancialExpenseStatus;
  vendor: string | null;
  notes: string | null;
  payment_id: string | null;
  cycle_id: string | null;
  created_at: string | null;
}

export interface AdminFinancialSummary {
  period: AdminFinancialPeriod;
  from: string;
  to: string;
  revenueCents: number;
  revenueCount: number;
  refundCents: number;
  refundCount: number;
  expenseCents: number;
  expenseCount: number;
  pendingExpenseCents: number;
  pendingExpenseCount: number;
  netCents: number;
  expensesByCategory: {
    id: string;
    name: string;
    cents: number;
    count: number;
  }[];
}

export type AdminFinancialMovementKind =
  | 'income'
  | 'expense'
  | 'expense_pending'
  | 'refund';

export interface AdminFinancialMovementRow {
  id: string;
  kind: AdminFinancialMovementKind;
  label: string;
  counterparty: string | null;
  amount_cents: number;
  date: string;
  source: 'payment' | 'expense';
  categoryName?: string;
}

export interface AdminFinancialDashboard {
  summary: AdminFinancialSummary;
  cashFlow: {
    month: string;
    label: string;
    inflowCents: number;
    outflowCents: number;
    netCents: number;
  }[];
  movements: AdminFinancialMovementRow[];
  categories: AdminFinancialCategoryRow[];
}
