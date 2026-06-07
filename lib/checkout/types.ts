import type { PaintKitBumpId } from './order-bumps';
import type { PlanSlug } from './plans';

export interface CheckoutData {
  planSlug: PlanSlug;
  paintKitBump: PaintKitBumpId | null;
  addressId: string;
  specialNotes: string;
}
