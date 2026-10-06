import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { notifyAdminSubscriptionEvent } from '@/lib/admin/subscription-payment-notifications';
import { PLAN_SLUGS } from '@/lib/checkout/plans';
import { CHECKOUT_COUPONS_ENABLED } from '@/lib/checkout/public';
import { createCheckoutComboPix } from '@/lib/checkout/combo-pix';
import {
  BILLING_TERMS,
  isComboTerm,
  type BillingTerm,
} from '@/lib/checkout/combo-billing';
import {
  marketingAttributionInputSchema,
  marketingAttributionToRecord,
} from '@/lib/marketing/attribution';
import { getActivePaymentProvider } from '@/lib/payments/provider';
import { REFERRAL_COOKIE_NAME } from '@/lib/referral/cookie';
import { registerReferralAtCheckout } from '@/lib/referral/referrals';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z
  .object({
    planSlug: z.enum(PLAN_SLUGS).optional(),
    planSlugs: z.array(z.enum(PLAN_SLUGS)).min(1).max(1).optional(),
    addressId: z.string().uuid(),
    specialNotes: z.string().max(2000).optional().default(''),
    paintKitBump: z.enum(['amador', 'profissional']).nullable().optional(),
    paintKitBumpRecurring: z.boolean().optional().default(false),
    couponCode: z.string().max(64).optional().nullable(),
    billingTerm: z.enum(BILLING_TERMS),
    marketingAttribution: marketingAttributionInputSchema,
  })
  .refine((value) => value.planSlug || (value.planSlugs?.length ?? 0) > 0, {
    message: 'Informe o plano.',
  });

function httpStatusForCheckoutPixError(message: string): {
  status: number;
  code?: string;
} {
  if (
    message.includes('já está ativa') ||
    message.includes('já possui assinatura ativa') ||
    message.includes('já possui uma assinatura ativa')
  ) {
    return { status: 409, code: 'SUBSCRIPTION_ALREADY_ACTIVE' };
  }

  if (message.includes('pagamento em atraso')) {
    return { status: 409, code: 'SUBSCRIPTION_PAST_DUE' };
  }

  return { status: 400 };
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const billingTerm = body.billingTerm as BillingTerm;
  if (!isComboTerm(billingTerm)) {
    return NextResponse.json(
      { error: 'PIX no checkout está disponível apenas para combos.' },
      { status: 400 }
    );
  }

  const planSlug = body.planSlugs?.[0] ?? body.planSlug;
  if (!planSlug) {
    return NextResponse.json({ error: 'Informe o plano.' }, { status: 400 });
  }

  if (body.couponCode?.trim() && !CHECKOUT_COUPONS_ENABLED) {
    return NextResponse.json(
      { error: 'Cupons desativados no checkout.' },
      { status: 400 }
    );
  }

  try {
    const result = await createCheckoutComboPix({
      userId: user.id,
      planSlug,
      addressId: body.addressId,
      billingTerm,
      couponCode: body.couponCode,
      specialNotes: body.specialNotes,
      paintKitBump: body.paintKitBump ?? null,
      paintKitBumpRecurring: body.paintKitBumpRecurring,
      marketingAttribution: marketingAttributionToRecord(body.marketingAttribution),
    });

    const admin = createAdminClient();
    const referralCookie = cookies().get(REFERRAL_COOKIE_NAME)?.value ?? null;
    let referralRegistered = false;

    if (referralCookie) {
      const referralResult = await registerReferralAtCheckout(admin, {
        referredUserId: user.id,
        subscriptionId: result.subscriptionId,
        referralCode: referralCookie,
        usedPromoCode: Boolean(body.couponCode?.trim()),
      });
      referralRegistered = referralResult === 'created';
    }

    if (!result.alreadyPaid) {
      const gateway = await getActivePaymentProvider();
      void notifyAdminSubscriptionEvent(admin, {
        type: 'subscription_pending',
        subscriptionId: result.subscriptionId,
        userId: user.id,
        amountCents: result.amountCents,
        paymentMethod: 'pix',
        gateway,
      }).catch((error) => {
        console.error('[admin] combo pix pending notify failed:', error);
      });
    }

    const response = NextResponse.json({
      success: true,
      alreadyPaid: result.alreadyPaid,
      subscriptionId: result.subscriptionId,
      amountCents: result.amountCents,
      pix: result.pix,
    });

    if (referralRegistered) {
      response.cookies.set(REFERRAL_COOKIE_NAME, '', {
        maxAge: 0,
        path: '/',
      });
    }

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Não foi possível gerar o PIX do combo.';
    console.error('[checkout] combo pix:', error);
    const mapped = httpStatusForCheckoutPixError(message);
    return NextResponse.json(
      { error: message, ...(mapped.code ? { code: mapped.code } : {}) },
      { status: mapped.status }
    );
  }
}
