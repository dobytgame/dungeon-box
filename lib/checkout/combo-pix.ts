import type { PlanSlug } from '@/lib/checkout/plans';
import { isComboTerm, type BillingTerm } from '@/lib/checkout/combo-billing';
import type { PaintKitBumpId } from '@/lib/checkout/order-bumps';
import type { MarketingAttributionRecord } from '@/lib/marketing/attribution';
import { createAdminSubscriptionWithPix } from '@/lib/admin/admin-subscription-pix';
import { createAsaasCheckoutComboPix } from '@/lib/asaas/combo-pix-checkout';
import { CHECKOUT_COMBO_PIX_EXPIRES_IN_SECONDS } from '@/lib/pagarme/subscription-pix';
import { getActivePaymentProvider } from '@/lib/payments/provider';
import { createAdminClient } from '@/lib/supabase/admin';

export type CheckoutComboPixInput = {
  userId: string;
  planSlug: PlanSlug;
  addressId: string;
  billingTerm: BillingTerm;
  couponCode?: string | null;
  specialNotes?: string | null;
  paintKitBump?: PaintKitBumpId | null;
  paintKitBumpRecurring?: boolean;
  marketingAttribution?: MarketingAttributionRecord | null;
};

export type CheckoutComboPixResult = {
  subscriptionId: string;
  amountCents: number;
  alreadyPaid: boolean;
  pix: {
    encodedImage?: string;
    payload: string;
    expirationDate: string;
    imageUrl?: string;
  };
};

export async function createCheckoutComboPix(
  input: CheckoutComboPixInput
): Promise<CheckoutComboPixResult> {
  if (!isComboTerm(input.billingTerm)) {
    throw new Error('PIX no checkout está disponível apenas para combos.');
  }

  const provider = await getActivePaymentProvider();
  const admin = createAdminClient();

  if (provider === 'pagarme') {
    const result = await createAdminSubscriptionWithPix(admin, {
      userId: input.userId,
      planSlug: input.planSlug,
      addressId: input.addressId,
      billingTerm: input.billingTerm,
      couponCode: input.couponCode,
      specialNotes: input.specialNotes,
      paintKitBump: input.paintKitBump,
      paintKitBumpRecurring: input.paintKitBumpRecurring,
      marketingAttribution: input.marketingAttribution,
      expiresInSeconds: CHECKOUT_COMBO_PIX_EXPIRES_IN_SECONDS,
    });

    return {
      subscriptionId: result.subscriptionId,
      amountCents: result.amountCents,
      alreadyPaid: result.alreadyPaid,
      pix: result.pix,
    };
  }

  if (provider === 'asaas') {
    const result = await createAsaasCheckoutComboPix(admin, input);
    return {
      subscriptionId: result.subscriptionId,
      amountCents: result.amountCents,
      alreadyPaid: result.alreadyPaid,
      pix: result.pix,
    };
  }

  throw new Error('PIX do combo não está disponível neste gateway.');
}
