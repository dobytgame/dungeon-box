/**
 * Alinha recorrência de combos existentes no gateway.
 *
 * Uso:
 *   npx tsx scripts/repair-combo-recurring.ts
 *   npx tsx scripts/repair-combo-recurring.ts --dry-run
 *   npx tsx scripts/repair-combo-recurring.ts --id=<subscription_uuid>
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { repairAllComboRecurringSubscriptions } from '@/lib/subscriptions/repair-combo-recurring';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const idArg = process.argv.find((arg) => arg.startsWith('--id='));
  const subscriptionId = idArg?.slice('--id='.length)?.trim() || undefined;

  const admin = createAdminClient();
  const result = await repairAllComboRecurringSubscriptions(admin, {
    dryRun,
    subscriptionId,
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
