import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { PlanSlug } from '@/lib/checkout/plans';
import { cancelAsaasSubscriptionBestEffort } from '@/lib/asaas/subscription-api';
import { buildBillingAddress } from '@/lib/pagarme/subscription-checkout';
import { attachPagarmeSubscriptionToExisting } from '@/lib/pagarme/migrate-subscription';
import { userFacingPagarmeError } from '@/lib/pagarme/errors';
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

  const { data: subscription } = await admin
    .from('subscriptions')
    .select(
      `
      id,
      user_id,
      plan_id,
      address_id,
      special_notes,
      promo_code,
      shipping_cents,
      shipping_region,
      billing_term,
      asaas_subscription_id,
      plans!plan_id(name, slug, price_cents)
    `
    )
    .eq('id', migration.subscription_id)
    .eq('user_id', migration.user_id)
    .maybeSingle();

  if (!subscription?.address_id) {
    return NextResponse.json({ error: 'Assinatura não encontrada.' }, { status: 404 });
  }

  const planData = Array.isArray(subscription.plans)
    ? subscription.plans[0]
    : subscription.plans;

  if (!planData?.slug) {
    return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, full_name, cpf, phone, pagarme_customer_id')
    .eq('id', migration.user_id)
    .single();

  const { data: address } = await admin
    .from('addresses')
    .select(
      'recipient, zip_code, street, number, complement, neighborhood, city, state'
    )
    .eq('id', subscription.address_id)
    .maybeSingle();

  if (!profile?.email || !address) {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 422 });
  }

  try {
    const result = await attachPagarmeSubscriptionToExisting({
      supabase: admin,
      subscriptionId: subscription.id,
      userId: migration.user_id,
      planSlug: planData.slug as PlanSlug,
      planName: planData.name,
      priceCents: planData.price_cents + (subscription.shipping_cents ?? 0),
      cardToken: body.cardToken,
      cardLast4: body.cardLast4,
      cardBrand: body.cardBrand,
      billingAddress: buildBillingAddress(address),
      profile: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        cpf: profile.cpf,
        phone: profile.phone,
        pagarme_customer_id: profile.pagarme_customer_id,
      },
      address,
    });

    if (subscription.asaas_subscription_id) {
      await cancelAsaasSubscriptionBestEffort(subscription.asaas_subscription_id);
    }

    await admin
      .from('subscriptions')
      .update({
        asaas_subscription_id: null,
        asaas_customer_id: null,
        updated_at: now.toISOString(),
      })
      .eq('id', subscription.id);

    await admin
      .from('gateway_migration_log')
      .update({
        status: 'updated',
        card_updated_at: now.toISOString(),
      })
      .eq('id', migration.id);

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      pagarmeSubscriptionId: result.pagarmeSubscriptionId,
    });
  } catch (error) {
    console.error('[migrate-payment]', error);
    return NextResponse.json(
      { error: userFacingPagarmeError(error) },
      { status: 502 }
    );
  }
}
