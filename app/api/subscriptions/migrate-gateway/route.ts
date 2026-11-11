import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PAGARME_CONFIGURED } from '@/lib/pagarme/client';
import { completeAsaasToPagarmeMigration } from '@/lib/pagarme/complete-asaas-migration';
import { completePixToPagarmeCardMigration } from '@/lib/pagarme/complete-pix-card-migration';
import { isAsaasSubscriptionNeedingPagarmeMigration } from '@/lib/pagarme/complete-asaas-migration';
import { isPixSubscriptionNeedingCardMigration } from '@/lib/pagarme/complete-pix-card-migration';
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

  const { data: subscription } = await admin
    .from('subscriptions')
    .select(
      'id, status, asaas_subscription_id, pagarme_subscription_id, migrated_to_pagarme_at'
    )
    .eq('id', body.subscriptionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!subscription) {
    return NextResponse.json({ error: 'Assinatura não encontrada.' }, { status: 404 });
  }

  const usePix = await isPixSubscriptionNeedingCardMigration(admin, body.subscriptionId);
  const useAsaas = isAsaasSubscriptionNeedingPagarmeMigration(subscription);

  if (!usePix && !useAsaas) {
    return NextResponse.json(
      { error: 'Esta assinatura não está elegível para cadastro de cartão.' },
      { status: 409 }
    );
  }

  const result = useAsaas
    ? await completeAsaasToPagarmeMigration({
        admin,
        subscriptionId: body.subscriptionId,
        userId: user.id,
        cardToken: body.cardToken,
        cardLast4: body.cardLast4,
        cardBrand: body.cardBrand,
      })
    : await completePixToPagarmeCardMigration({
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
    chargedImmediately: result.chargedImmediately,
    amountChargedCents: result.amountChargedCents,
    nextBillingDate: result.nextBillingDate,
  });
}
