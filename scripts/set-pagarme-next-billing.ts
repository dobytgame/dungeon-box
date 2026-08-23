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

async function main() {
  const subscriptionId = process.argv[2];
  const dateArg = process.argv[3];
  if (!subscriptionId || !dateArg) {
    console.error(
      'Usage: npx tsx scripts/set-pagarme-next-billing.ts <subscriptionId> YYYY-MM-DD'
    );
    process.exit(1);
  }

  const [year, month, day] = dateArg.split('-').map(Number);
  if (!year || !month || !day) {
    console.error('Invalid date. Use YYYY-MM-DD.');
    process.exit(1);
  }

  // Meia-noite UTC do dia seguinte = mesmo dia civil no painel (America/Sao_Paulo).
  // Ex.: 08/09 no admin → 2026-09-09T00:00:00Z, como 14/09 hoje é 2026-09-15T00:00:00Z.
  const pagarmeDate = new Date(Date.UTC(year, month - 1, day + 1));

  const { createAdminClient } = await import('../lib/supabase/admin');
  const { updatePagarmeSubscriptionBillingDate } = await import(
    '../lib/pagarme/change-billing-day'
  );
  const { pagarmeRequest } = await import('../lib/pagarme/client');

  const admin = createAdminClient();
  const { data: subscription } = await admin
    .from('subscriptions')
    .select(
      'id, status, next_billing_date, pagarme_subscription_id, current_period_end'
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) {
    throw new Error('Assinatura não encontrada.');
  }
  if (!subscription.pagarme_subscription_id) {
    throw new Error('Assinatura sem vínculo Pagar.me.');
  }

  const before = await pagarmeRequest<{
    status?: string;
    start_at?: string;
    next_billing_at?: string;
  }>(`/subscriptions/${encodeURIComponent(subscription.pagarme_subscription_id)}`);

  let pagarmeSynced = true;
  let pagarmeError: string | null = null;
  try {
    await updatePagarmeSubscriptionBillingDate(
      subscription.pagarme_subscription_id,
      pagarmeDate
    );
  } catch (error) {
    pagarmeSynced = false;
    pagarmeError = error instanceof Error ? error.message : String(error);
    try {
      await pagarmeRequest(
        `/subscriptions/${encodeURIComponent(subscription.pagarme_subscription_id)}/start-at`,
        {
          method: 'PATCH',
          body: { start_at: pagarmeDate.toISOString().slice(0, 10) },
        }
      );
      pagarmeSynced = true;
      pagarmeError = null;
    } catch (startAtError) {
      pagarmeError = startAtError instanceof Error
        ? startAtError.message
        : String(startAtError);
    }
  }

  const nextBillingIso = pagarmeDate.toISOString();
  const { error: localError } = await admin
    .from('subscriptions')
    .update({
      next_billing_date: nextBillingIso,
      current_period_end: nextBillingIso,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);

  const afterRemote = await pagarmeRequest<{
    status?: string;
    start_at?: string;
    next_billing_at?: string;
  }>(`/subscriptions/${encodeURIComponent(subscription.pagarme_subscription_id)}`);

  const { data: afterLocal } = await admin
    .from('subscriptions')
    .select('status, next_billing_date, current_period_end')
    .eq('id', subscriptionId)
    .maybeSingle();

  console.log(
    JSON.stringify(
      {
        subscriptionId,
        requestedDisplayDate: dateArg,
        pagarmeDate: pagarmeDate.toISOString().slice(0, 10),
        pagarmeSynced,
        pagarmeError,
        localError: localError?.message ?? null,
        before: {
          local: subscription.next_billing_date,
          pagarmeStatus: before.status,
          pagarmeNext: before.next_billing_at,
          pagarmeStart: before.start_at,
        },
        after: {
          local: afterLocal,
          pagarmeStatus: afterRemote.status,
          pagarmeNext: afterRemote.next_billing_at,
          pagarmeStart: afterRemote.start_at,
        },
      },
      null,
      2
    )
  );

  if (!pagarmeSynced || localError) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
