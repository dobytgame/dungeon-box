export type SubscriptionStatus =
  | 'pending'
  | 'active'
  | 'paused'
  | 'past_due'
  | 'cancelled'
  | 'expired';

export type CycleStatus =
  | 'upcoming'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'failed';

export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'authorized'
  | 'in_process'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  preferred_color: string | null;
  newsletter: boolean | null;
  is_admin: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  pieces_min: number;
  pieces_max: number;
  color_choices: number;
  freight_free: boolean;
  freight_regions: string[] | null;
  store_discount: number;
  has_vip_group: boolean;
  has_vote: boolean;
  accent_color: string | null;
}

export interface Address {
  id: string;
  user_id: string;
  label: string | null;
  recipient: string;
  zip_code: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  is_default: boolean | null;
  created_at: string | null;
}

export interface Theme {
  id: string;
  month_number: number;
  year: number;
  slug: string;
  name: string;
  lore: string | null;
  emoji: string | null;
  image_url: string | null;
}

export interface SubscriptionCycle {
  id: string;
  subscription_id: string;
  cycle_number: number;
  theme_id: string | null;
  status: CycleStatus;
  payment_id: string | null;
  paid_at: string | null;
  amount_cents: number | null;
  tracking_code: string | null;
  carrier: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  estimated_delivery: string | null;
  color_choices: string[] | null;
  bonus_pieces: number | null;
  bonus_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  themes: Theme | Theme[] | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string | null;
  address_id: string | null;
  status: SubscriptionStatus;
  mp_subscription_id: string | null;
  mp_payer_id: string | null;
  asaas_subscription_id?: string | null;
  asaas_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_customer_id?: string | null;
  color_choices: string[] | null;
  special_notes: string | null;
  promo_code?: string | null;
  started_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_billing_date: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  current_cycle: number | null;
  loyalty_level: number | null;
  created_at: string | null;
  updated_at: string | null;
  plans: Plan | Plan[] | null;
  addresses: Address | Address[] | null;
  subscription_cycles?: SubscriptionCycle[];
}

export interface Payment {
  id: string;
  user_id: string | null;
  subscription_id: string | null;
  mp_payment_id: string | null;
  mp_order_id: string | null;
  amount_cents: number;
  currency: string | null;
  status: PaymentStatus;
  status_detail: string | null;
  payment_method: string | null;
  payment_type: string | null;
  installments: number | null;
  card_last4: string | null;
  card_brand: string | null;
  paid_at: string | null;
  created_at: string | null;
}

export interface LoyaltyLevel {
  id: string;
  level: number;
  name: string;
  icon: string | null;
  min_cycles: number;
  bonus_pieces: number | null;
  store_discount: number | null;
  has_vote: boolean | null;
  has_exclusive: boolean | null;
  description: string | null;
}
