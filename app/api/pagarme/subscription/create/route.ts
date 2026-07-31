import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PLAN_SLUGS, type PlanSlug } from '@/lib/checkout/plans';
import { CHECKOUT_COUPONS_ENABLED } from '@/lib/checkout/public';
import {
  recordPromoRedemption,
  resolvePromoCode,
} from '@/lib/checkout/promo-codes';
import { buildSpecialNotes } from '@/lib/checkout/special-notes';
import { getPaintKitBump } from '@/lib/checkout/order-bumps';
import { PAGARME_CONFIGURED } from '@/lib/pagarme/client';
import { userFacingPagarmeError } from '@/lib/pagarme/errors';
import {
  buildBillingAddress,
  createPagarmeSubscription,
} from '@/lib/pagarme/subscription-checkout';
import { syncPagarmeSubscriptionPayments } from '@/lib/pagarme/reconcile-pending';
import { isActivePagarmeCheckout } from '@/lib/payments/provider';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import { resolveShippingForCheckout } from '@/lib/shipping/resolve-server';
import { ShippingQuoteError, shippingMonthlyCents } from '@/lib/shipping/quote';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { findBlockingSubscriptionForPlan } from '@/lib/subscriptions/find-blocking';
import { prepareCheckoutSubscription } from '@/lib/subscriptions/pending-checkout';
import { cookies } from 'next/headers';
import { REFERRAL_COOKIE_NAME } from '@/lib/referral/cookie';
import { registerReferralAtCheckout } from '@/lib/referral/referrals';
import { BILLING_TERMS } from '@/lib/checkout/combo-billing';

const bodySchema = z
  .object({
    planSlug: z.enum(PLAN_SLUGS).optional(),
    planSlugs: z.array(z.enum(PLAN_SLUGS)).min(1).max(3).optional(),
    addressId: z.string().uuid(),
    specialNotes: z.string().max(2000).optional().default(''),
    paintKitBump: z.enum(['amador', 'profissional']).nullable().optional(),
    paintKitBumpRecurring: z.boolean().optional().default(false),
    cardToken: z.string().min(1),
    cardLast4: z.string().regex(/^\d{4}$/),
    cardBrand: z.string().max(32),
    couponCode: z.string().max(64).optional().nullable(),
    billingTerm: z.enum(BILLING_TERMS).optional().default('monthly'),
  })
  .refine((value) => value.planSlug || (value.planSlugs?.length ?? 0) > 0, {
    message: 'Informe ao menos um plano.',
  });

function resolveCheckoutPlanSlugs(body: z.infer<typeof bodySchema>): PlanSlug[] {
  if (body.planSlugs?.length) {
    return Array.from(new Set(body.planSlugs));
  }
  if (body.planSlug) {
    return [body.planSlug];
  }
  return [];
}

function buildOneTimeDescription(bumpName: string): string {
  return `DungeonBox — ${bumpName} (1ª caixa)`;
}

export async function POST(request: Request) {
  if (!PAGARME_CONFIGURED || !(await isActivePagarmeCheckout())) {
    return NextResponse.json(
      { error: 'Pagar.me não configurado como provedor de pagamento.' },
      { status: 503 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    body = bodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  if (isComboTerm(body.billingTerm ?? 'monthly')) {
    return NextResponse.json(
      { error: 'Combos disponíveis apenas com Asaas no momento.' },
      { status: 400 }
    );
  }

  const planSlugs = resolveCheckoutPlanSlugs(body);
  if (planSlugs.length === 0) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, cpf, full_name, phone, pagarme_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile?.email) {
    return NextResponse.json(
      { error: 'Perfil incompleto. Atualize seu e-mail no cadastro.' },
      { status: 422 }
    );
  }

  const cpf = profile.cpf?.replace(/\D/g, '') ?? '';
  if (cpf.length !== 11) {
    return NextResponse.json(
      {
        error:
          'CPF obrigatório para assinatura. Complete seu perfil antes de pagar.',
        code: 'CPF_REQUIRED',
      },
      { status: 422 }
    );
  }

  const phone = profile.phone?.replace(/\D/g, '') ?? '';
  if (phone.length < 10) {
    return NextResponse.json(
      {
        error:
          'Telefone obrigatório para pagamento. Cadastre seu telefone no perfil.',
        code: 'PHONE_REQUIRED',
      },
      { status: 422 }
    );
  }

  const { data: address } = await supabase
    .from('addresses')
    .select(
      'id, recipient, zip_code, street, number, complement, neighborhood, city, state'
    )
    .eq('id', body.addressId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!address) {
    return NextResponse.json(
      { error: 'Endereço de entrega inválido.' },
      { status: 400 }
    );
  }

  const bump = getPaintKitBump(body.paintKitBump ?? null);
  const bumpRecurring = Boolean(body.paintKitBumpRecurring && bump);
  const specialNotes = buildSpecialNotes(
    body.paintKitBump ?? null,
    body.specialNotes,
    bumpRecurring
  );

  const billingAddress = buildBillingAddress(address);
  const created: Array<{
    subscriptionId: string;
    pagarmeSubscriptionId: string;
    planSlug: PlanSlug;
  }> = [];
  let promoRecorded = false;
  const referralCookie = cookies().get(REFERRAL_COOKIE_NAME)?.value ?? null;
  let referralRegistered = false;

  try {
    for (let index = 0; index < planSlugs.length; index += 1) {
      const planSlug = planSlugs[index]!;

      const { data: plan } = await supabase
        .from('plans')
        .select('id, name, price_cents, slug')
        .eq('slug', planSlug)
        .eq('is_active', true)
        .single();

      if (!plan) {
        return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
      }

      const existingSub = await findBlockingSubscriptionForPlan(
        supabase,
        user.id,
        plan.id
      );

      const checkoutPrep = await prepareCheckoutSubscription(supabase, existingSub);

      if (checkoutPrep.kind === 'blocked') {
        return NextResponse.json(
          { error: checkoutPrep.message, code: checkoutPrep.code },
          { status: 409 }
        );
      }

      if (checkoutPrep.kind === 'activated') {
        return NextResponse.json(
          {
            error: `Sua assinatura do plano ${plan.name} já está ativa.`,
            code: 'SUBSCRIPTION_ALREADY_ACTIVE',
            subscriptionId: checkoutPrep.subscriptionId,
            activated: true,
          },
          { status: 409 }
        );
      }

      const retrySubscriptionId =
        checkoutPrep.kind === 'retry' ? checkoutPrep.subscriptionId : null;

      let shippingQuote;
      try {
        const promoSupabase = body.couponCode?.trim()
          ? createAdminClient()
          : undefined;
        shippingQuote = await resolveShippingForCheckout(
          supabase,
          user.id,
          planSlug,
          body.addressId,
          {
            couponCode: body.couponCode,
            promoSupabase,
          }
        );
      } catch (error) {
        if (error instanceof ShippingQuoteError) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        throw error;
      }

      const includeBump = index === 0 && bump;
      const bumpOneTimeCents =
        includeBump && !bumpRecurring ? bump.priceCents : 0;
      const bumpMonthlyCents =
        includeBump && bumpRecurring ? bump.priceCents : 0;
      const freightMonthlyCents = shippingMonthlyCents(shippingQuote);
      const oneTimeCents = bumpOneTimeCents;

      let chargePriceCents = plan.price_cents;
      let resolvedCoupon: Awaited<ReturnType<typeof resolvePromoCode>> | null =
        null;

      if (body.couponCode?.trim()) {
        if (!CHECKOUT_COUPONS_ENABLED) {
          return NextResponse.json(
            { error: 'Cupons desativados no checkout.' },
            { status: 400 }
          );
        }

        try {
          const admin = createAdminClient();
          resolvedCoupon = await resolvePromoCode(
            admin,
            body.couponCode,
            planSlug,
            user.id,
            plan.price_cents
          );
          chargePriceCents = resolvedCoupon.discountedPriceCents;
        } catch {
          // Cupom pode valer só para alguns planos do pedido.
        }
      }

      chargePriceCents += bumpMonthlyCents + freightMonthlyCents;

      const planDescription =
        bumpMonthlyCents > 0 && bump
          ? `${plan.name} + ${bump.name}`
          : plan.name;

      const result = await createPagarmeSubscription(supabase, {
        userId: user.id,
        planSlug,
        planId: plan.id,
        planName: planDescription,
        priceCents: chargePriceCents,
        billingTerm: body.billingTerm ?? 'monthly',
        promoCode: resolvedCoupon?.promo.code ?? null,
        addressId: body.addressId,
        specialNotes: specialNotes ?? '',
        profile: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          cpf: profile.cpf,
          phone: profile.phone,
          pagarme_customer_id: profile.pagarme_customer_id,
        },
        address,
        cardToken: body.cardToken,
        cardLast4: body.cardLast4,
        cardBrand: body.cardBrand,
        billingAddress,
        retrySubscriptionId,
        shippingCents: freightMonthlyCents,
        shippingRegion: shippingQuote.region,
        oneTimeCents,
        oneTimeDescription:
          includeBump && !bumpRecurring && bump
            ? buildOneTimeDescription(bump.name)
            : null,
      });

      if (resolvedCoupon && !promoRecorded) {
        const admin = createAdminClient();
        await recordPromoRedemption(
          admin,
          resolvedCoupon.promo.id,
          user.id,
          result.subscriptionId,
          resolvedCoupon.promo.code
        );
        promoRecorded = true;
      }

      await syncPagarmeSubscriptionPayments(
        supabase,
        result.pagarmeSubscriptionId
      ).catch((err) => {
        console.error('[pagarme] post-create sync failed:', err);
      });

      created.push({
        subscriptionId: result.subscriptionId,
        pagarmeSubscriptionId: result.pagarmeSubscriptionId,
        planSlug,
      });

      if (!referralRegistered && referralCookie) {
        const admin = createAdminClient();
        const referralResult = await registerReferralAtCheckout(admin, {
          referredUserId: user.id,
          subscriptionId: result.subscriptionId,
          referralCode: referralCookie,
          usedPromoCode: Boolean(resolvedCoupon || body.couponCode?.trim()),
        });
        if (referralResult === 'created') {
          referralRegistered = true;
        }
      }
    }

    const response = NextResponse.json({
      success: true,
      subscriptions: created,
      subscriptionId: created[0]?.subscriptionId,
      pagarmeSubscriptionId: created[0]?.pagarmeSubscriptionId,
    });

    if (referralRegistered) {
      response.cookies.set(REFERRAL_COOKIE_NAME, '', {
        maxAge: 0,
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('[pagarme] create subscription:', error);
    return NextResponse.json(
      { error: userFacingPagarmeError(error) },
      { status: 502 }
    );
  }
}
