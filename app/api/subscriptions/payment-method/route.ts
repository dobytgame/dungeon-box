import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientIpFromRequest } from '@/lib/asaas/client-ip';
import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { userFacingAsaasError } from '@/lib/asaas/errors';
import { PAGARME_CONFIGURED } from '@/lib/pagarme/client';
import { userFacingPagarmeError } from '@/lib/pagarme/errors';
import { buildBillingAddress } from '@/lib/pagarme/subscription-checkout';
import { resolveSubscriptionGateway } from '@/lib/payments/subscription-gateway';
import { updateAsaasSubscriptionPaymentMethod } from '@/lib/subscriptions/update-asaas-payment-method';
import { updatePagarmeSubscriptionPaymentMethod } from '@/lib/subscriptions/update-pagarme-payment-method';
import { createClient } from '@/lib/supabase/server';

const cardSchema = z.object({
  holderName: z.string().min(2).max(120),
  number: z.string().regex(/^\d{13,19}$/),
  expiryMonth: z.string().regex(/^\d{1,2}$/),
  expiryYear: z.string().regex(/^\d{2,4}$/),
  ccv: z.string().regex(/^\d{3,4}$/),
});

const bodySchema = z.object({
  subscriptionId: z.string().uuid(),
  creditCard: cardSchema.optional(),
  cardToken: z.string().min(1).optional(),
  cardLast4: z.string().regex(/^\d{4}$/).optional(),
  cardBrand: z.string().max(32).optional(),
});

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

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(
      'id, address_id, asaas_subscription_id, pagarme_subscription_id, stripe_subscription_id, mp_subscription_id, is_partner'
    )
    .eq('id', body.subscriptionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!subscription?.address_id) {
    return NextResponse.json(
      { error: 'Endereço de entrega não encontrado.' },
      { status: 400 }
    );
  }

  const gateway = resolveSubscriptionGateway(subscription);

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, cpf, full_name, phone')
    .eq('id', user.id)
    .single();

  if (!profile?.email) {
    return NextResponse.json(
      { error: 'Perfil incompleto. Atualize seu e-mail no cadastro.' },
      { status: 422 }
    );
  }

  const { data: address } = await supabase
    .from('addresses')
    .select(
      'recipient, zip_code, street, number, complement, neighborhood, city, state'
    )
    .eq('id', subscription.address_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!address) {
    return NextResponse.json(
      { error: 'Endereço de entrega inválido.' },
      { status: 400 }
    );
  }

  if (gateway === 'pagarme') {
    if (!PAGARME_CONFIGURED || !body.cardToken || !body.cardLast4 || !body.cardBrand) {
      return NextResponse.json({ error: 'Dados de cartão inválidos.' }, { status: 400 });
    }

    try {
      const result = await updatePagarmeSubscriptionPaymentMethod({
        supabase,
        userId: user.id,
        subscriptionId: body.subscriptionId,
        cardToken: body.cardToken,
        cardLast4: body.cardLast4,
        cardBrand: body.cardBrand,
        billingAddress: buildBillingAddress(address),
      });

      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('[payment-method] pagarme:', error);
      return NextResponse.json(
        { error: userFacingPagarmeError(error) },
        { status: 502 }
      );
    }
  }

  if (gateway !== 'asaas') {
    return NextResponse.json(
      { error: 'Troca de cartão indisponível para este gateway.' },
      { status: 400 }
    );
  }

  if (!ASAAS_CONFIGURED || !body.creditCard) {
    return NextResponse.json(
      { error: 'Troca de cartão indisponível no momento.' },
      { status: 503 }
    );
  }

  const cpf = profile.cpf?.replace(/\D/g, '') ?? '';
  if (cpf.length !== 11) {
    return NextResponse.json(
      { error: 'CPF obrigatório. Complete seu perfil antes de atualizar o cartão.' },
      { status: 422 }
    );
  }

  const phone = profile.phone?.replace(/\D/g, '') ?? '';
  if (phone.length < 10) {
    return NextResponse.json(
      { error: 'Telefone obrigatório. Cadastre seu telefone no perfil.' },
      { status: 422 }
    );
  }

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

  try {
    const result = await updateAsaasSubscriptionPaymentMethod({
      supabase,
      userId: user.id,
      subscriptionId: body.subscriptionId,
      creditCard,
      creditCardHolderInfo,
      remoteIp: getClientIpFromRequest(request),
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[payment-method] asaas:', error);
    return NextResponse.json(
      { error: userFacingAsaasError(error) },
      { status: 502 }
    );
  }
}
