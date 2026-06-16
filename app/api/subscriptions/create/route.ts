import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PLAN_SLUGS } from '@/lib/checkout/plans';
import { buildSpecialNotes } from '@/lib/checkout/special-notes';
import { getPaintKitBump } from '@/lib/checkout/order-bumps';
import { createClient } from '@/lib/supabase/server';
import { MP_CONFIGURED } from '@/lib/mercadopago';
import { validateMpCredentialPair } from '@/lib/mercadopago/credentials';
import { createSubscriptionPreapproval } from '@/lib/mercadopago/create-preapproval';
import { userFacingMpError } from '@/lib/mercadopago/errors';
import { resolveShippingForCheckout } from '@/lib/shipping/resolve-server';
import { ShippingQuoteError } from '@/lib/shipping/quote';
import { activateSubscriptionFromMp } from '@/lib/subscriptions/activate';
import { findBlockingSubscriptionForPlan } from '@/lib/subscriptions/find-blocking';
import { prepareCheckoutSubscription } from '@/lib/subscriptions/pending-checkout';

const bodySchema = z.object({
  planSlug: z.enum(PLAN_SLUGS),
  addressId: z.string().uuid(),
  specialNotes: z.string().max(2000).optional().default(''),
  paintKitBump: z.enum(['amador', 'profissional']).nullable().optional(),
  paintKitBumpRecurring: z.boolean().optional().default(false),
  cardTokenId: z.string().min(1),
  payerEmail: z.string().email().optional(),
});

export async function POST(request: Request) {
  if (!MP_CONFIGURED) {
    return NextResponse.json(
      { error: 'Mercado Pago não configurado.' },
      { status: 503 }
    );
  }

  const credentialCheck = validateMpCredentialPair();
  if (!credentialCheck.ok) {
    console.error('[mp] credential mismatch:', {
      publicMode: credentialCheck.publicMode,
      tokenMode: credentialCheck.tokenMode,
    });
    return NextResponse.json(
      { error: credentialCheck.error },
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
    .select('email, cpf, full_name')
    .eq('id', user.id)
    .single();

  const cpf = profile?.cpf?.replace(/\D/g, '') ?? '';
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

  const payerEmail = body.payerEmail || profile?.email || user.email;
  if (!payerEmail) {
    return NextResponse.json(
      { error: 'E-mail do pagador não encontrado.' },
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

  const { data: plan } = await supabase
    .from('plans')
    .select('id, name, price_cents, slug')
    .eq('slug', body.planSlug)
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
    shippingQuote = await resolveShippingForCheckout(
      supabase,
      user.id,
      body.planSlug,
      body.addressId
    );
  } catch (error) {
    if (error instanceof ShippingQuoteError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const bump = getPaintKitBump(body.paintKitBump ?? null);
  const bumpRecurring = Boolean(body.paintKitBumpRecurring && bump);

  const specialNotes = buildSpecialNotes(
    body.paintKitBump ?? null,
    body.specialNotes,
    bumpRecurring
  );

  const transactionAmount = Number(
    ((plan.price_cents + (bumpRecurring && bump ? bump.priceCents : 0)) / 100).toFixed(
      2
    )
  );

  try {
    const { preApproval } = await createSubscriptionPreapproval({
      cardTokenId: body.cardTokenId,
      payerEmail,
      externalReference: user.id,
      reason: `DungeonBox ${plan.name} — Assinatura Mensal`,
      transactionAmount,
    });

    if (!preApproval.id) {
      return NextResponse.json(
        { error: 'Mercado Pago não retornou ID da assinatura.' },
        { status: 502 }
      );
    }

    const subscriptionPayload = {
      plan_id: plan.id,
      address_id: body.addressId,
      special_notes: specialNotes,
      status: 'pending' as const,
      mp_subscription_id: preApproval.id,
      mp_payer_id:
        preApproval.payer_id != null ? String(preApproval.payer_id) : null,
      shipping_cents: shippingQuote.cents,
      shipping_region: shippingQuote.region,
      updated_at: new Date().toISOString(),
    };

    let subscription: { id: string; status: string } | null = null;

    if (retrySubscriptionId) {
      const { data, error: updateError } = await supabase
        .from('subscriptions')
        .update(subscriptionPayload)
        .eq('id', retrySubscriptionId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .select('id, status')
        .single();

      if (updateError || !data) {
        console.error('subscription retry update:', updateError);
        return NextResponse.json(
          { error: 'Não foi possível atualizar a assinatura.' },
          { status: 500 }
        );
      }
      subscription = data;
    } else {
      const { data, error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          ...subscriptionPayload,
        })
        .select('id, status')
        .single();

      if (insertError || !data) {
        console.error('subscription insert:', insertError);
        return NextResponse.json(
          { error: 'Não foi possível salvar a assinatura.' },
          { status: 500 }
        );
      }
      subscription = data;
    }

    let activated = false;
    if (preApproval.status === 'authorized') {
      activated = await activateSubscriptionFromMp(
        supabase,
        subscription.id,
        preApproval
      );
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      mpSubscriptionId: preApproval.id,
      mpStatus: preApproval.status,
      activated,
    });
  } catch (error) {
    const mpError = error as {
      status?: number;
      message?: string;
      error?: string;
      cause?: unknown;
    };
    console.error('MP preapproval error:', {
      status: mpError.status,
      message: mpError.message,
      error: mpError.error,
      cause: mpError.cause,
    });
    return NextResponse.json(
      { error: userFacingMpError(error) },
      { status: 502 }
    );
  }
}
