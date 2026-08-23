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
  const repairAll = process.argv.includes('--repair-all');

  if (!subscriptionId && !repairAll) {
    console.error(
      'Usage: npx tsx scripts/charge-pagarme-subscription-now.ts <subscriptionId> [--repair-all]'
    );
    process.exit(1);
  }

  const { createAdminClient } = await import('../lib/supabase/admin');
  const {
    repairMonthlyProductionForSubscription,
    repairMonthlyProductionMonthsAndLoyalty,
  } = await import('../lib/subscriptions/monthly-production-schedule');
  const { chargePagarmeSubscriptionNow } = await import(
    '../lib/pagarme/manual-charge'
  );

  const admin = createAdminClient();

  if (repairAll) {
    const allRepair = await repairMonthlyProductionMonthsAndLoyalty(admin);
    console.log(JSON.stringify({ repairAll: allRepair }, null, 2));
  }

  if (!subscriptionId) return;

  const localRepair = await repairMonthlyProductionForSubscription(
    admin,
    subscriptionId
  );
  const charge = await chargePagarmeSubscriptionNow(admin, subscriptionId);

  const { data: after } = await admin
    .from('subscriptions')
    .select(
      'status, current_cycle, next_billing_date, asaas_subscription_id, pagarme_subscription_id, migrated_to_pagarme_at'
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  console.log(
    JSON.stringify(
      {
        subscriptionId,
        localRepair,
        charge,
        after,
      },
      null,
      2
    )
  );

  if (charge.status === 'error') {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
