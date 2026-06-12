import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PLAN_SLUGS } from '@/lib/checkout/plans';
import { CHECKOUT_COUPONS_ENABLED } from '@/lib/checkout/public';
import {
  recordPromoRedemption,
  resolvePromoCode,
} from '@/lib/checkout/promo-codes';
import { buildSpecialNotes } from '@/lib/checkout/special-notes';
import { getClientIpFromRequest } from '@/lib/asaas/client-ip';
import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { userFacingAsaasError } from '@/lib/asaas/errors';
import { syncAsaasSubscriptionPayments } from '@/lib/asaas/payment-sync';
import { createAsaasSubscription } from '@/lib/asaas/subscription-checkout';
import { isAsaasCheckout } from '@/lib/payments/provider';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { prepareCheckoutSubscription } from '@/lib/subscriptions/pending-checkout';

const cardSchema = z.object({
  holderName: z.string().min(2).max(120),
  number: z.string().regex(/^\d{13,19}$/),
  expiryMonth: z.string().regex(/^\d{1,2}$/),
  expiryYear: z.string().regex(/^\d{2,4}$/),
  ccv: z.string().regex(/^\d{3,4}$/),
});

const bodySchema = z.object({
  planSlug: z.enum(PLAN_SLUGS),
  addressId: z.string().uuid(),
  specialNotes: z.string().max(2000).optional().default(''),
  paintKitBump: z.enum(['amador', 'profissional']).nullable().optional(),
  creditCard: cardSchema,
  couponCode: z.string().max(64).optional().nullable(),
});

const BLOCKING_STATUSES = ['pending', 'active', 'paused', 'past_due'] as const;

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

export async function POST(request: Request) {
  if (!ASAAS_CONFIGURED || !isAsaasCheckout()) {
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

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select(
      'id, status, mp_subscription_id, stripe_subscription_id, asaas_subscription_id'
    )
    .eq('user_id', user.id)
    .in('status', [...BLOCKING_STATUSES])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

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
        error: 'Sua assinatura já está ativa. Acesse o painel para ver os detalhes.',
        code: 'SUBSCRIPTION_ALREADY_ACTIVE',
        subscriptionId: checkoutPrep.subscriptionId,
        activated: true,
      },
      { status: 409 }
    );
  }

  const retrySubscriptionId =
    checkoutPrep.kind === 'retry' ? checkoutPrep.subscriptionId : null;

  const { data: plan } = await supabase
    .from('plans')
    .select('id, name, price_cents, slug')
    .eq('slug', body.planSlug)
    .eq('is_active', true)
    .single();

  if (!plan) {
    return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
  }

  const specialNotes = buildSpecialNotes(
    body.paintKitBump ?? null,
    body.specialNotes
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

  let chargePriceCents = plan.price_cents;
  let resolvedCoupon: Awaited<ReturnType<typeof resolvePromoCode>> | null = null;

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
        body.planSlug,
        user.id,
        plan.price_cents
      );
      chargePriceCents = resolvedCoupon.discountedPriceCents;
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : 'Cupom inválido.',
        },
        { status: 400 }
      );
    }
  }

  try {
    const result = await createAsaasSubscription(supabase, {
      userId: user.id,
      planSlug: body.planSlug,
      planId: plan.id,
      planName: plan.name,
      priceCents: chargePriceCents,
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
      creditCard: {
        holderName,
        number: normalizeCardNumber(body.creditCard.number),
        expiryMonth,
        expiryYear,
        ccv: body.creditCard.ccv.replace(/\D/g, ''),
      },
      creditCardHolderInfo: {
        name: profile.full_name?.trim() || holderName,
        email: profile.email,
        cpfCnpj: cpf,
        postalCode: address.zip_code.replace(/\D/g, ''),
        addressNumber: address.number,
        addressComplement: address.complement ?? undefined,
        phone,
      },
      retrySubscriptionId,
    });

    if (resolvedCoupon) {
      const admin = createAdminClient();
      await recordPromoRedemption(
        admin,
        resolvedCoupon.promo.id,
        user.id,
        result.subscriptionId,
        resolvedCoupon.promo.code
      );
    }

    void syncAsaasSubscriptionPayments(result.asaasSubscriptionId).catch((err) => {
      console.error('[asaas] post-create sync failed:', err);
    });

    return NextResponse.json({
      success: true,
      subscriptionId: result.subscriptionId,
      asaasSubscriptionId: result.asaasSubscriptionId,
    });
  } catch (error) {
    console.error('[asaas] create subscription:', error);
    return NextResponse.json(
      { error: userFacingAsaasError(error) },
      { status: 502 }
    );
  }
}
