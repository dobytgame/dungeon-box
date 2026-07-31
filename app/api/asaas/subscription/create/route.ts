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
import { getClientIpFromRequest } from '@/lib/asaas/client-ip';
import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { userFacingAsaasError } from '@/lib/asaas/errors';
import { syncAsaasSubscriptionPayments } from '@/lib/asaas/payment-sync';
import { syncComboPaymentIfPending } from '@/lib/asaas/combo-payment';
import { createAsaasSubscription } from '@/lib/asaas/subscription-checkout';
import { isActiveAsaasCheckout } from '@/lib/payments/provider';
import { resolveShippingForCheckout } from '@/lib/shipping/resolve-server';
import { ShippingQuoteError, shippingMonthlyCents } from '@/lib/shipping/quote';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { findBlockingSubscriptionForPlan } from '@/lib/subscriptions/find-blocking';
import { prepareCheckoutSubscription } from '@/lib/subscriptions/pending-checkout';
import { cookies } from 'next/headers';
import { REFERRAL_COOKIE_NAME } from '@/lib/referral/cookie';
import { registerReferralAtCheckout } from '@/lib/referral/referrals';
import {
  BILLING_TERMS,
  calculateComboTotalCents,
  COMBO_MAX_INSTALLMENTS,
  isComboTerm,
  type BillingTerm,
} from '@/lib/checkout/combo-billing';
import type { CheckoutData } from '@/lib/checkout/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const cardSchema = z.object({
  holderName: z.string().min(2).max(120),
  number: z.string().regex(/^\d{13,19}$/),
  expiryMonth: z.string().regex(/^\d{1,2}$/),
  expiryYear: z.string().regex(/^\d{2,4}$/),
  ccv: z.string().regex(/^\d{3,4}$/),
});

const bodySchema = z
  .object({
    planSlug: z.enum(PLAN_SLUGS).optional(),
    planSlugs: z.array(z.enum(PLAN_SLUGS)).min(1).max(3).optional(),
    addressId: z.string().uuid(),
    specialNotes: z.string().max(2000).optional().default(''),
    paintKitBump: z.enum(['amador', 'profissional']).nullable().optional(),
    paintKitBumpRecurring: z.boolean().optional().default(false),
    creditCard: cardSchema,
    couponCode: z.string().max(64).optional().nullable(),
    billingTerm: z.enum(BILLING_TERMS).optional().default('monthly'),
    installmentCount: z.number().int().min(1).max(COMBO_MAX_INSTALLMENTS).optional().default(1),
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

function normalizeCardNumber(raw: string): string {
  return raw.replace(/\D/g, '');
}

function normalizeExpiryMonth(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const month = Number.parseInt(digits, 10);
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error('Mês de validade inválido.');
  }
  return String(month);
}

function normalizeExpiryYear(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 2) return `20${digits}`;
  if (digits.length === 4) return digits;
  throw new Error('Ano de validade inválido.');
}

function buildOneTimeDescription(bumpName: string): string {
  return `DungeonBox — ${bumpName} (1ª caixa)`;
}

export async function POST(request: Request) {
  if (!ASAAS_CONFIGURED || !(await isActiveAsaasCheckout())) {
    return NextResponse.json(
      { error: 'Asaas não configurado como provedor de pagamento.' },
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

  const planSlugs = resolveCheckoutPlanSlugs(body);
  if (planSlugs.length === 0) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const billingTerm = (body.billingTerm ?? 'monthly') as BillingTerm;
  if (isComboTerm(billingTerm) && planSlugs.length > 1) {
    return NextResponse.json(
      { error: 'Combos disponíveis apenas para um plano por vez.' },
      { status: 400 }
    );
  }

  const installmentCount = isComboTerm(billingTerm)
    ? body.installmentCount ?? 1
    : 1;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, cpf, full_name, phone, asaas_customer_id')
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

  let expiryMonth: string;
  let expiryYear: string;
  try {
    expiryMonth = normalizeExpiryMonth(body.creditCard.expiryMonth);
    expiryYear = normalizeExpiryYear(body.creditCard.expiryYear);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Validade do cartão inválida.',
      },
      { status: 400 }
    );
  }

  const holderName = body.creditCard.holderName.trim();
  const creditCard = {
    holderName,
    number: normalizeCardNumber(body.creditCard.number),
    expiryMonth,
    expiryYear,
    ccv: body.creditCard.ccv.replace(/\D/g, ''),
  };
  const creditCardHolderInfo = {
    name: profile.full_name?.trim() || holderName,
    email: profile.email,
    cpfCnpj: cpf,
    postalCode: address.zip_code.replace(/\D/g, ''),
    addressNumber: address.number,
    addressComplement: address.complement ?? undefined,
    phone,
  };

  const created: Array<{
    subscriptionId: string;
    asaasSubscriptionId: string;
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

      let comboTotalCents: number | undefined;
      if (isComboTerm(billingTerm) && index === 0) {
        const checkoutSnapshot: CheckoutData = {
          planSlugs: [planSlug],
          billingTerm,
          installmentCount,
          paintKitBump: body.paintKitBump ?? null,
          paintKitBumpRecurring: bumpRecurring,
          addressId: body.addressId,
          specialNotes: body.specialNotes ?? '',
          discountedPlanCentsByPlan: resolvedCoupon
            ? { [planSlug]: chargePriceCents - bumpMonthlyCents - freightMonthlyCents }
            : undefined,
          shippingByPlan: {
            [planSlug]: {
              cents: freightMonthlyCents,
              free: freightMonthlyCents === 0,
              region: shippingQuote.region,
              label: shippingQuote.label ?? shippingQuote.region,
              etaDaysMin: shippingQuote.etaDaysMin,
              etaDaysMax: shippingQuote.etaDaysMax,
            },
          },
        };
        comboTotalCents = calculateComboTotalCents(checkoutSnapshot, billingTerm);
      }

      const result = await createAsaasSubscription(supabase, {
        userId: user.id,
        planSlug,
        planId: plan.id,
        planName: planDescription,
        priceCents: chargePriceCents,
        billingTerm,
        installmentCount,
        comboTotalCents,
        promoCode: resolvedCoupon?.promo.code ?? null,
        addressId: body.addressId,
        specialNotes: specialNotes ?? '',
        remoteIp: getClientIpFromRequest(request),
        profile: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          cpf: profile.cpf,
          phone: profile.phone,
          asaas_customer_id: profile.asaas_customer_id,
        },
        address,
        creditCard,
        creditCardHolderInfo,
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

      await syncAsaasSubscriptionPayments(result.asaasSubscriptionId ?? '').catch(
        (err) => {
          console.error('[asaas] post-create sync failed:', err);
        }
      );

      if (result.comboPaymentId) {
        await syncComboPaymentIfPending(
          supabase,
          result.subscriptionId,
          result.comboPaymentId,
          result.asaasCustomerId
        );
      }

      created.push({
        subscriptionId: result.subscriptionId,
        asaasSubscriptionId: result.asaasSubscriptionId ?? '',
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
        } else {
          console.info('[referral] checkout attribution skipped:', {
            userId: user.id,
            subscriptionId: result.subscriptionId,
            reason: referralResult,
          });
        }
      }
    }

    const response = NextResponse.json({
      success: true,
      subscriptions: created,
      subscriptionId: created[0]?.subscriptionId,
      asaasSubscriptionId: created[0]?.asaasSubscriptionId,
    });

    if (referralRegistered) {
      response.cookies.set(REFERRAL_COOKIE_NAME, '', {
        maxAge: 0,
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('[asaas] create subscription:', error);
    return NextResponse.json(
      { error: userFacingAsaasError(error) },
      { status: 502 }
    );
  }
}
