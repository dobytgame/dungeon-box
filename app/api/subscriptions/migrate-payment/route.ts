import { NextResponse } from 'next/server';
import { z } from 'zod';
import { completeAsaasToPagarmeMigration } from '@/lib/pagarme/complete-asaas-migration';
import { PAGARME_CONFIGURED } from '@/lib/pagarme/client';
import { createAdminClient } from '@/lib/supabase/admin';

const bodySchema = z.object({
  updateToken: z.string().uuid(),
  cardToken: z.string().min(1),
  cardLast4: z.string().regex(/^\d{4}$/),
  cardBrand: z.string().max(32),
});

export async function POST(request: Request) {
  if (!PAGARME_CONFIGURED) {
    return NextResponse.json(
      { error: 'Migração de pagamento indisponível.' },
      { status: 503 }
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: migration } = await admin
    .from('gateway_migration_log')
    .select('id, subscription_id, user_id, status, token_expires_at')
    .eq('update_token', body.updateToken)
    .eq('status', 'sent')
    .maybeSingle();

  if (!migration) {
    return NextResponse.json(
      { error: 'Link de atualização inválido ou expirado.' },
      { status: 400 }
    );
  }

  if (
    migration.token_expires_at &&
    new Date(migration.token_expires_at) < now
  ) {
    await admin
      .from('gateway_migration_log')
      .update({ status: 'expired' })
      .eq('id', migration.id);
    return NextResponse.json(
      { error: 'Link de atualização expirado.' },
      { status: 400 }
    );
  }

  const result = await completeAsaasToPagarmeMigration({
    admin,
    subscriptionId: migration.subscription_id,
    userId: migration.user_id,
    cardToken: body.cardToken,
    cardLast4: body.cardLast4,
    cardBrand: body.cardBrand,
    migrationLogId: migration.id,
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
    chargedImmediately: result.chargedImmediately,
    amountChargedCents: result.amountChargedCents,
    nextBillingDate: result.nextBillingDate,
  });
}
