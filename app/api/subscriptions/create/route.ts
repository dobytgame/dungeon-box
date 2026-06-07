import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PLAN_SLUGS } from '@/lib/checkout/plans';
import { buildSpecialNotes } from '@/lib/checkout/special-notes';
import { createClient } from '@/lib/supabase/server';
import { MP_CONFIGURED } from '@/lib/mercadopago';
import { validateMpCredentialPair } from '@/lib/mercadopago/credentials';
import { createSubscriptionPreapproval } from '@/lib/mercadopago/create-preapproval';
import { userFacingMpError } from '@/lib/mercadopago/errors';
import { activateSubscriptionFromMp } from '@/lib/subscriptions/activate';

const bodySchema = z.object({
  planSlug: z.enum(PLAN_SLUGS),
  addressId: z.string().uuid(),
  specialNotes: z.string().max(2000).optional().default(''),
  paintKitBump: z.enum(['amador', 'profissional']).nullable().optional(),
  cardTokenId: z.string().min(1),
  payerEmail: z.string().email().optional(),
});

const BLOCKING_STATUSES = ['pending', 'active', 'paused', 'past_due'] as const;

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

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('user_id', user.id)
    .in('status', [...BLOCKING_STATUSES])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingSub) {
    const message =
      existingSub.status === 'active' || existingSub.status === 'paused'
        ? 'Você já possui uma assinatura ativa.'
        : 'Já existe uma assinatura em processamento. Aguarde ou acesse sua conta.';
    return NextResponse.json({ error: message, code: 'SUBSCRIPTION_EXISTS' }, {
      status: 409,
    });
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

  const specialNotes = buildSpecialNotes(
    body.paintKitBump ?? null,
    body.specialNotes
  );

  const transactionAmount = Number((plan.price_cents / 100).toFixed(2));

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

    const { data: subscription, error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        address_id: body.addressId,
        special_notes: specialNotes,
        status: 'pending',
        mp_subscription_id: preApproval.id,
        mp_payer_id:
          preApproval.payer_id != null ? String(preApproval.payer_id) : null,
      })
      .select('id, status')
      .single();

    if (insertError || !subscription) {
      console.error('subscription insert:', insertError);
      return NextResponse.json(
        { error: 'Não foi possível salvar a assinatura.' },
        { status: 500 }
      );
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
    console.error('MP preapproval error:', error);
    return NextResponse.json(
      { error: userFacingMpError(error) },
      { status: 502 }
    );
  }
}
