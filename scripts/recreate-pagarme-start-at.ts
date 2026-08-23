import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'));
loadEnvFile(resolve(process.cwd(), '.env'));

type RemoteSubscription = {
  id?: string;
  status?: string;
  code?: string;
  start_at?: string;
  next_billing_at?: string;
  customer?: { id?: string };
  card?: { id?: string };
  items?: Array<{
    description?: string;
    quantity?: number;
    pricing_scheme?: { scheme_type?: string; price?: number };
  }>;
  metadata?: Record<string, string>;
};

async function main() {
  const subscriptionId = process.argv[2];
  const startAt = process.argv[3];
  if (!subscriptionId || !startAt) {
    console.error(
      'Usage: npx tsx scripts/recreate-pagarme-start-at.ts <subscriptionId> YYYY-MM-DD'
    );
    process.exit(1);
  }

  const { createAdminClient } = await import('../lib/supabase/admin');
  const { pagarmeRequest } = await import('../lib/pagarme/client');
  const { cancelPagarmeSubscriptionBestEffort } = await import(
    '../lib/pagarme/subscription-api'
  );

  const admin = createAdminClient();
  const { data: local } = await admin
    .from('subscriptions')
    .select(
      'id, user_id, status, pagarme_subscription_id, pagarme_customer_id, next_billing_date'
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!local?.pagarme_subscription_id) {
    throw new Error('Assinatura local sem vínculo Pagar.me.');
  }

  const oldId = local.pagarme_subscription_id as string;
  const old = await pagarmeRequest<RemoteSubscription>(
    `/subscriptions/${encodeURIComponent(oldId)}`
  );

  const customerId =
    old.customer?.id?.trim() ||
    (local.pagarme_customer_id as string | null)?.trim() ||
    null;
  const cardId = old.card?.id?.trim() || null;
  const item = old.items?.[0];
  const price = item?.pricing_scheme?.price;
  const description = item?.description?.trim() || 'DungeonBox';

  if (!customerId || !cardId || !price) {
    throw new Error(
      `Dados incompletos no Pagar.me (customer=${customerId} card=${cardId} price=${price}).`
    );
  }

  const created = await pagarmeRequest<RemoteSubscription>('/subscriptions', {
    method: 'POST',
    body: {
      code: `${subscriptionId}-d${startAt.replaceAll('-', '')}`.slice(0, 52),
      payment_method: 'credit_card',
      currency: 'BRL',
      interval: 'month',
      interval_count: 1,
      billing_type: 'prepaid',
      start_at: startAt,
      customer_id: customerId,
      card_id: cardId,
      items: [
        {
          description,
          quantity: item?.quantity || 1,
          pricing_scheme: {
            scheme_type: 'unit',
            price,
          },
        },
      ],
      metadata: {
        ...(old.metadata ?? {}),
        subscription_id: subscriptionId,
        rescheduled_from: oldId,
        deferred_start: 'true',
      },
    },
  });

  if (!created.id) {
    throw new Error('Pagar.me não devolveu o id da nova assinatura.');
  }

  await cancelPagarmeSubscriptionBestEffort(oldId);

  const nextBillingIso = `${startAt}T12:00:00.000Z`;
  const nowIso = new Date().toISOString();
  const { error: localError } = await admin
    .from('subscriptions')
    .update({
      pagarme_subscription_id: created.id,
      pagarme_customer_id: customerId,
      next_billing_date: nextBillingIso,
      current_period_end: nextBillingIso,
      updated_at: nowIso,
    })
    .eq('id', subscriptionId);

  console.log(
    JSON.stringify(
      {
        subscriptionId,
        startAt,
        oldPagarmeId: oldId,
        oldNext: old.next_billing_at,
        newPagarmeId: created.id,
        newStatus: created.status,
        newStartAt: created.start_at,
        newNext: created.next_billing_at,
        localError: localError?.message ?? null,
        localNext: nextBillingIso,
      },
      null,
      2
    )
  );

  if (localError) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
