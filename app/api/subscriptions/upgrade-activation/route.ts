import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  payPlanUpgradeWithCard,
  startPlanUpgradePixPayment,
  syncPlanUpgradePixPayment,
} from '@/lib/subscriptions/upgrade-activation';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.discriminatedUnion('method', [
  z.object({
    subscriptionId: z.string().uuid(),
    method: z.literal('pix'),
  }),
  z.object({
    subscriptionId: z.string().uuid(),
    method: z.literal('credit_card'),
    cardToken: z.string().min(1),
  }),
]);

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const subscriptionId = new URL(request.url).searchParams.get('subscriptionId');
  if (!subscriptionId) {
    return NextResponse.json({ error: 'Informe a assinatura.' }, { status: 400 });
  }

  const state = await syncPlanUpgradePixPayment({
    userId: user.id,
    subscriptionId,
  });

  return NextResponse.json({ state: state === 'active' ? 'active' : 'pending' });
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
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  if (body.method === 'pix') {
    const result = await startPlanUpgradePixPayment({
      userId: user.id,
      subscriptionId: body.subscriptionId,
    });
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  const result = await payPlanUpgradeWithCard({
    userId: user.id,
    subscriptionId: body.subscriptionId,
    cardToken: body.cardToken,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
