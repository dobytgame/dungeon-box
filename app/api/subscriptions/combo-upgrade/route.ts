import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientIpFromRequest } from '@/lib/asaas/client-ip';
import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { userFacingAsaasError } from '@/lib/asaas/errors';
import { BILLING_TERMS, COMBO_MAX_INSTALLMENTS } from '@/lib/checkout/combo-billing';
import { isAsaasCheckout } from '@/lib/payments/provider';
import { upgradeMonthlySubscriptionToCombo } from '@/lib/subscriptions/combo-upgrade';
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
  billingTerm: z.enum(['combo_3', 'combo_6', 'combo_12']),
  installmentCount: z.number().int().min(1).max(COMBO_MAX_INSTALLMENTS).default(1),
  creditCard: cardSchema,
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
  if (!ASAAS_CONFIGURED || !isAsaasCheckout()) {
    return NextResponse.json(
      { error: 'Migração para combo disponível apenas via Asaas.' },
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

  if (!BILLING_TERMS.includes(body.billingTerm)) {
    return NextResponse.json({ error: 'Combo inválido.' }, { status: 400 });
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
      { error: 'CPF obrigatório. Complete seu perfil antes de pagar.' },
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

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('address_id')
    .eq('id', body.subscriptionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!subscription?.address_id) {
    return NextResponse.json(
      { error: 'Endereço de entrega não encontrado.' },
      { status: 400 }
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
    const result = await upgradeMonthlySubscriptionToCombo({
      supabase,
      userId: user.id,
      subscriptionId: body.subscriptionId,
      billingTerm: body.billingTerm,
      installmentCount: body.installmentCount,
      creditCard,
      creditCardHolderInfo,
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
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[combo-upgrade] api:', error);
    return NextResponse.json(
      { error: userFacingAsaasError(error) },
      { status: 502 }
    );
  }
}
