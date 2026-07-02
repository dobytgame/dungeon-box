import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PLAN_SLUGS } from '@/lib/checkout/plans';
import { buildSpecialNotes } from '@/lib/checkout/special-notes';
import { getPaintKitBump } from '@/lib/checkout/order-bumps';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isStripeCheckout } from '@/lib/payments/provider';
import { STRIPE_CONFIGURED } from '@/lib/stripe/server';
import { userFacingStripeError } from '@/lib/stripe/errors';
import { prepareStripeSubscription } from '@/lib/stripe/subscription-checkout';
import { resolveShippingForCheckout } from '@/lib/shipping/resolve-server';
import { ShippingQuoteError, shippingMonthlyCents } from '@/lib/shipping/quote';
import { findBlockingSubscriptionForPlan } from '@/lib/subscriptions/find-blocking';
import { prepareCheckoutSubscription } from '@/lib/subscriptions/pending-checkout';
import { REFERRAL_COOKIE_NAME } from '@/lib/referral/cookie';
import { registerReferralAtCheckout } from '@/lib/referral/referrals';

const bodySchema = z.object({
  planSlug: z.enum(PLAN_SLUGS),
  addressId: z.string().uuid(),
  specialNotes: z.string().max(2000).optional().default(''),
  paintKitBump: z.enum(['amador', 'profissional']).nullable().optional(),
  paintKitBumpRecurring: z.boolean().optional().default(false),
  promotionCode: z.string().max(64).optional().nullable(),
  couponCode: z.string().max(64).optional().nullable(),
});

function buildOneTimeDescription(bumpName: string): string {
  return `DungeonBox — ${bumpName} (1ª caixa)`;
}

export async function POST(request: Request) {
  if (!STRIPE_CONFIGURED || !isStripeCheckout()) {
    return NextResponse.json(
      { error: 'Stripe não configurado como provedor de pagamento.' },
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

  const { data: plan } = await supabase
    .from('plans')
    .select('id, name, price_cents, slug')
    .eq('slug', body.planSlug)
    .eq('is_active', true)
    .single();

  if (!plan) {
    return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, cpf, full_name, stripe_customer_id')
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

  const { data: address } = await supabase
    .from('addresses')
    .select('id')
    .eq('id', body.addressId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!address) {
    return NextResponse.json(
      { error: 'Endereço de entrega inválido.' },
      { status: 400 }
    );
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
        error:
          'Sua assinatura deste plano já está ativa. Acesse o painel para ver os detalhes.',
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
      body.planSlug,
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

  const bump = getPaintKitBump(body.paintKitBump ?? null);
  const bumpRecurring = Boolean(body.paintKitBumpRecurring && bump);
  const bumpOneTimeCents = bump && !bumpRecurring ? bump.priceCents : 0;
  const freightMonthlyCents = shippingMonthlyCents(shippingQuote);
  const oneTimeCents = bumpOneTimeCents;

  const specialNotes = buildSpecialNotes(
    body.paintKitBump ?? null,
    body.specialNotes,
    bumpRecurring
  );

  try {
    const result = await prepareStripeSubscription(supabase, {
      userId: user.id,
      planSlug: body.planSlug,
      planId: plan.id,
      addressId: body.addressId,
      specialNotes: specialNotes ?? '',
      profile: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        cpf: profile.cpf,
        stripe_customer_id: profile.stripe_customer_id,
      },
      retrySubscriptionId,
      promotionCode: body.promotionCode?.trim() || null,
      shippingCents: freightMonthlyCents,
      shippingRegion: shippingQuote.region,
      oneTimeCents,
      oneTimeDescription:
        bump && !bumpRecurring ? buildOneTimeDescription(bump.name) : null,
      recurringBump:
        bumpRecurring && bump
          ? { name: bump.name, priceCents: bump.priceCents }
          : null,
      recurringShipping:
        freightMonthlyCents > 0
          ? { label: shippingQuote.label, priceCents: freightMonthlyCents }
          : null,
    });

    const referralCookie = cookies().get(REFERRAL_COOKIE_NAME)?.value ?? null;
    let referralRegistered = false;
    if (referralCookie) {
      const admin = createAdminClient();
      const referralResult = await registerReferralAtCheckout(admin, {
        referredUserId: user.id,
        subscriptionId: result.subscriptionId,
        referralCode: referralCookie,
        usedPromoCode: Boolean(
          body.promotionCode?.trim() || body.couponCode?.trim()
        ),
      });
      if (referralResult === 'created') {
        referralRegistered = true;
      } else {
        console.info('[referral] stripe checkout attribution skipped:', {
          userId: user.id,
          subscriptionId: result.subscriptionId,
          reason: referralResult,
        });
      }
    }

    const response = NextResponse.json({
      clientSecret: result.clientSecret,
      subscriptionId: result.subscriptionId,
      stripeSubscriptionId: result.stripeSubscriptionId,
    });

    if (referralRegistered) {
      response.cookies.set(REFERRAL_COOKIE_NAME, '', {
        maxAge: 0,
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('[stripe] prepare subscription:', error);
    return NextResponse.json(
      { error: userFacingStripeError(error) },
      { status: 502 }
    );
  }
}
