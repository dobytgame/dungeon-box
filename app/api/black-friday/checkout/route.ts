import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  BF_COMBO_DISCOUNT_PERCENT,
  BF_COMBO_TERM,
  BF_INSTALLMENT_MONTHLY_RATE,
  BF_MAX_INSTALLMENTS,
  BF_MONTHLY_DISCOUNT_CYCLES,
  BF_MONTHLY_DISCOUNT_PERCENT,
  BLACK_FRIDAY_CAMPAIGN_CODE,
  BLACK_FRIDAY_PLAN_SLUG,
  getBlackFridayWindow,
  quoteBlackFriday,
} from '@/lib/campaigns/black-friday';
import { notifyAdminSubscriptionEvent } from '@/lib/admin/subscription-payment-notifications';
import {
  marketingAttributionInputSchema,
  marketingAttributionToRecord,
} from '@/lib/marketing/attribution';
import { PAGARME_CONFIGURED, PagarmeApiError } from '@/lib/pagarme/client';
import { userFacingPagarmeError } from '@/lib/pagarme/errors';
import { syncPagarmeSubscriptionPayments } from '@/lib/pagarme/reconcile-pending';
import {
  buildBillingAddress,
  createPagarmeSubscription,
} from '@/lib/pagarme/subscription-checkout';
import { resolveShippingForCheckout } from '@/lib/shipping/resolve-server';
import { ShippingQuoteError, shippingMonthlyCents } from '@/lib/shipping/quote';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { findBlockingSubscriptionForPlan } from '@/lib/subscriptions/find-blocking';
import { prepareCheckoutSubscription } from '@/lib/subscriptions/pending-checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  option: z.enum(['mensal', 'combo']),
  addressId: z.string().uuid(),
  installmentCount: z.number().int().min(1).max(BF_MAX_INSTALLMENTS).optional().default(1),
  cardToken: z.string().min(1),
  cardLast4: z.string().regex(/^\d{4}$/),
  cardBrand: z.string().max(32),
  expectedChargeCents: z.number().int().positive(),
  marketingAttribution: marketingAttributionInputSchema,
});

export async function POST(request: Request) {
  if (!PAGARME_CONFIGURED) {
    return NextResponse.json(
      { error: 'Pagamento indisponível no momento.' },
      { status: 503 }
    );
  }

  if (getBlackFridayWindow() !== 'open') {
    return NextResponse.json(
      { error: 'A oferta da Black Friday não está disponível agora.', code: 'CAMPAIGN_CLOSED' },
      { status: 409 }
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
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const isCombo = body.option === 'combo';
  const installmentCount = isCombo ? body.installmentCount : 1;

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
  if ((profile.cpf?.replace(/\D/g, '') ?? '').length !== 11) {
    return NextResponse.json(
      { error: 'Informe seu CPF para continuar.', code: 'CPF_REQUIRED' },
      { status: 422 }
    );
  }
  if ((profile.phone?.replace(/\D/g, '') ?? '').length < 10) {
    return NextResponse.json(
      { error: 'Informe seu telefone para continuar.', code: 'PHONE_REQUIRED' },
      { status: 422 }
    );
  }

  const { data: address } = await supabase
    .from('addresses')
    .select('id, recipient, zip_code, street, number, complement, neighborhood, city, state')
    .eq('id', body.addressId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!address) {
    return NextResponse.json({ error: 'Endereço de entrega inválido.' }, { status: 400 });
  }

  const { data: plan } = await supabase
    .from('plans')
    .select('id, name, price_cents, slug')
    .eq('slug', BLACK_FRIDAY_PLAN_SLUG)
    .eq('is_active', true)
    .single();

  if (!plan) {
    return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
  }

  const existingSub = await findBlockingSubscriptionForPlan(supabase, user.id, plan.id);
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
        error: 'Você já tem uma assinatura do Lendário ativa.',
        code: 'SUBSCRIPTION_ALREADY_ACTIVE',
        subscriptionId: checkoutPrep.subscriptionId,
      },
      { status: 409 }
    );
  }

  let shippingCents: number;
  let shippingRegion: string;
  try {
    const shippingQuote = await resolveShippingForCheckout(
      supabase,
      user.id,
      BLACK_FRIDAY_PLAN_SLUG,
      body.addressId,
      {}
    );
    shippingCents = shippingMonthlyCents(shippingQuote);
    shippingRegion = shippingQuote.region;
  } catch (error) {
    if (error instanceof ShippingQuoteError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const quote = quoteBlackFriday({
    option: body.option,
    planCents: plan.price_cents,
    shippingCents,
    installmentCount,
  });
  const chargeCents = quote.option === 'combo' ? quote.chargeCents : quote.firstChargeCents;

  if (chargeCents !== body.expectedChargeCents) {
    return NextResponse.json(
      {
        error: 'O valor foi atualizado. Confira o resumo e confirme de novo.',
        code: 'PRICE_CHANGED',
        chargeCents,
      },
      { status: 409 }
    );
  }

  const planName = `${plan.name} · Black Friday`;

  try {
    const result = await createPagarmeSubscription(supabase, {
      userId: user.id,
      planSlug: BLACK_FRIDAY_PLAN_SLUG,
      planId: plan.id,
      planName,
      priceCents: plan.price_cents + shippingCents,
      billingTerm: isCombo ? BF_COMBO_TERM : 'monthly',
      installmentCount,
      comboTotalCents: quote.option === 'combo' ? quote.chargeCents : undefined,
      comboRenewalCents: quote.option === 'combo' ? quote.renewalCents : undefined,
      monthlyDiscount:
        quote.option === 'mensal'
          ? { flatCents: quote.discountCents, cycles: quote.discountCycles }
          : null,
      campaignCode: BLACK_FRIDAY_CAMPAIGN_CODE,
      addressId: body.addressId,
      specialNotes: '',
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
      billingAddress: buildBillingAddress(address),
      retrySubscriptionId: checkoutPrep.kind === 'retry' ? checkoutPrep.subscriptionId : null,
      shippingCents,
      shippingRegion,
      oneTimeCents: 0,
      oneTimeDescription: null,
      marketingAttribution: marketingAttributionToRecord(body.marketingAttribution),
    });

    const admin = createAdminClient();
    const { error: signupError } = await admin.from('campaign_signups').upsert(
      {
        campaign_code: BLACK_FRIDAY_CAMPAIGN_CODE,
        user_id: user.id,
        subscription_id: result.subscriptionId,
        plan_slug: BLACK_FRIDAY_PLAN_SLUG,
        billing_term: isCombo ? BF_COMBO_TERM : 'monthly',
        plan_cents: plan.price_cents,
        shipping_cents: shippingCents,
        discount_percent: isCombo ? BF_COMBO_DISCOUNT_PERCENT : BF_MONTHLY_DISCOUNT_PERCENT,
        discount_cycles: isCombo ? null : BF_MONTHLY_DISCOUNT_CYCLES,
        discount_cents: quote.discountCents,
        installments: installmentCount,
        interest_rate_monthly:
          quote.option === 'combo' && quote.installments.interestCents > 0
            ? BF_INSTALLMENT_MONTHLY_RATE
            : null,
        interest_cents: quote.option === 'combo' ? quote.installments.interestCents : 0,
        first_charge_cents: chargeCents,
        renewal_cents: quote.option === 'combo' ? quote.renewalCents : quote.regularChargeCents,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'campaign_code,subscription_id' }
    );
    if (signupError) {
      console.error('[black-friday] campaign signup:', result.subscriptionId, signupError.message);
    }

    if (!isCombo) {
      await syncPagarmeSubscriptionPayments(supabase, result.pagarmeSubscriptionId).catch((err) => {
        console.error('[black-friday] post-create sync failed:', err);
      });
    }

    void notifyAdminSubscriptionEvent(admin, {
      type: 'subscription_pending',
      subscriptionId: result.subscriptionId,
      userId: user.id,
      amountCents: chargeCents,
      paymentMethod: 'credit_card',
      gateway: 'pagarme',
      planName,
    }).catch((err) => {
      console.error('[admin] subscription pending notify failed:', err);
    });

    return NextResponse.json({ success: true, subscriptionId: result.subscriptionId });
  } catch (error) {
    console.error('[black-friday] checkout:', error);
    if (error instanceof PagarmeApiError && error.body?.errors) {
      console.error('[black-friday] field errors:', JSON.stringify(error.body.errors));
    }
    return NextResponse.json({ error: userFacingPagarmeError(error) }, { status: 502 });
  }
}
