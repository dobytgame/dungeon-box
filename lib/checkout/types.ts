import type { PaintKitBumpId } from './order-bumps';
import type { PlanSlug } from './plans';

export interface CheckoutData {
  planSlug: PlanSlug;
  paintKitBump: PaintKitBumpId | null;
  addressId: string;
  specialNotes: string;
  /** Preço mensal do plano após cupom (centavos), quando aplicado no pagamento */
  discountedPlanCents?: number | null;
  couponCode?: string | null;
  couponSummary?: string | null;
}
