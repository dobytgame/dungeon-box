import type { PaintKitBumpId } from './order-bumps';
import type { PlanSlug } from './plans';

export type ShippingQuoteSnapshot = {
  cents: number;
  free: boolean;
  region: string;
  label: string;
  etaDaysMin: number;
  etaDaysMax: number;
};

export interface CheckoutData {
  planSlugs: PlanSlug[];
  paintKitBump: PaintKitBumpId | null;
  /** Kit de pintura incluso todo mês (cobrança recorrente) */
  paintKitBumpRecurring: boolean;
  addressId: string;
  specialNotes: string;
  /** Preço mensal por plano após cupom (centavos) */
  discountedPlanCentsByPlan?: Partial<Record<PlanSlug, number>>;
  couponCode?: string | null;
  couponSummary?: string | null;
  /** Frete mensal por plano (0 se cupom/promo de frete grátis) */
  shippingByPlan?: Partial<Record<PlanSlug, ShippingQuoteSnapshot>>;
}
