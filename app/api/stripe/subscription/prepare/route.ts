import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PLAN_SLUGS } from '@/lib/checkout/plans';
import { buildSpecialNotes } from '@/lib/checkout/special-notes';
import { createClient } from '@/lib/supabase/server';
import { STRIPE_CONFIGURED } from '@/lib/stripe/server';
import { userFacingStripeError } from '@/lib/stripe/errors';
import { prepareStripeSubscription } from '@/lib/stripe/subscription-checkout';
import { prepareCheckoutSubscription } from '@/lib/subscriptions/pending-checkout';

const bodySchema = z.object({
  planSlug: z.enum(PLAN_SLUGS),
  addressId: z.string().uuid(),
  specialNotes: z.string().max(2000).optional().default(''),
  paintKitBump: z.enum(['amador', 'profissional']).nullable().optional(),
  promotionCode: z.string().max(64).optional().nullable(),
});

const BLOCKING_STATUSES = ['pending', 'active', 'paused', 'past_due'] as const;

export async function POST(request: Request) {
  if (!STRIPE_CONFIGURED) {
    return NextResponse.json(
      { error: 'Stripe não configurado.' },
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

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id, status, mp_subscription_id, stripe_subscription_id')
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
    });

    return NextResponse.json({
      clientSecret: result.clientSecret,
      subscriptionId: result.subscriptionId,
      stripeSubscriptionId: result.stripeSubscriptionId,
    });
  } catch (error) {
    console.error('[stripe] prepare subscription:', error);
    return NextResponse.json(
      { error: userFacingStripeError(error) },
      { status: 502 }
    );
  }
}
