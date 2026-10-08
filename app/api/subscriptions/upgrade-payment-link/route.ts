import { NextResponse } from 'next/server';
import { z } from 'zod';
import { payPlanUpgradeWithCardToken } from '@/lib/subscriptions/upgrade-payment-link';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  token: z.string().uuid(),
  cardToken: z.string().min(1),
  cardLast4: z.string().regex(/^\d{4}$/),
  cardBrand: z.string().min(1).max(40),
});

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Dados do cartão inválidos.' }, { status: 400 });
  }

  const result = await payPlanUpgradeWithCardToken({
    admin: createAdminClient(),
    token: body.token,
    cardToken: body.cardToken,
    cardLast4: body.cardLast4,
    cardBrand: body.cardBrand,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
