import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PAGARME_CONFIGURED } from '@/lib/pagarme/client';
import { completeAsaasToPagarmeMigration } from '@/lib/pagarme/complete-asaas-migration';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  subscriptionId: z.string().uuid(),
  cardToken: z.string().min(1),
  cardLast4: z.string().regex(/^\d{4}$/),
  cardBrand: z.string().max(32),
});

/** Migração Asaas → Pagar.me autenticada (dashboard do usuário). */
export async function POST(request: Request) {
  if (!PAGARME_CONFIGURED) {
    return NextResponse.json(
      { error: 'Migração de pagamento indisponível.' },
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

  const admin = createAdminClient();
  const result = await completeAsaasToPagarmeMigration({
    admin,
    subscriptionId: body.subscriptionId,
    userId: user.id,
    cardToken: body.cardToken,
    cardLast4: body.cardLast4,
    cardBrand: body.cardBrand,
  });

  if ('error' in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 400 }
    );
  }

  return NextResponse.json({
    success: true,
    subscriptionId: result.subscriptionId,
    pagarmeSubscriptionId: result.pagarmeSubscriptionId,
  });
}
