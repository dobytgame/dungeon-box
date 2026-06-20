import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { getClientIpFromRequest } from '@/lib/asaas/client-ip';
import { isAsaasCheckout } from '@/lib/payments/provider';
import { purchasePaintKitAddon } from '@/lib/subscriptions/paint-kit-addon';
import { createClient } from '@/lib/supabase/server';

const cardSchema = z.object({
  holderName: z.string().min(2),
  number: z.string().min(13),
  expiryMonth: z.string().min(1),
  expiryYear: z.string().min(2),
  ccv: z.string().min(3),
});

const bodySchema = z.object({
  subscriptionId: z.string().uuid(),
  bumpId: z.enum(['amador', 'profissional']).default('profissional'),
  recurring: z.boolean().default(false),
  creditCard: cardSchema,
});

function normalizeCardNumber(value: string): string {
  return value.replace(/\D/g, '');
}

function normalizeExpiryMonth(value: string): string {
  const month = Number.parseInt(value.replace(/\D/g, ''), 10);
  if (month < 1 || month > 12) {
    throw new Error('Mês de validade inválido.');
  }
  return String(month).padStart(2, '0');
}

function normalizeExpiryYear(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 2) return `20${digits}`;
  if (digits.length === 4) return digits;
  throw new Error('Ano de validade inválido.');
}

export async function POST(request: Request) {
  if (!ASAAS_CONFIGURED || !isAsaasCheckout()) {
    return NextResponse.json(
      { error: 'Compra de kit disponível apenas via Asaas.' },
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
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, cpf, phone')
    .eq('id', user.id)
    .single();

  if (!profile?.email) {
    return NextResponse.json(
      { error: 'Complete seu perfil antes de comprar.' },
      { status: 422 }
    );
  }

  const cpf = profile.cpf?.replace(/\D/g, '') ?? '';
  const phone = profile.phone?.replace(/\D/g, '') ?? '';

  if (cpf.length !== 11) {
    return NextResponse.json(
      { error: 'CPF obrigatório. Atualize seu perfil.' },
      { status: 422 }
    );
  }

  if (phone.length < 10) {
    return NextResponse.json(
      { error: 'Telefone obrigatório. Atualize seu perfil.' },
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
    .select('number, zip_code, complement')
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

  const result = await purchasePaintKitAddon({
    supabase,
    userId: user.id,
    subscriptionId: body.subscriptionId,
    bumpId: body.bumpId,
    recurring: body.recurring,
    creditCard,
    creditCardHolderInfo,
    remoteIp: getClientIpFromRequest(request),
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
