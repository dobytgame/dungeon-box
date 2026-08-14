import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAdminClient } from '../lib/supabase/admin';
import { backfillPrepaidComboProductionSchedules } from '../lib/subscriptions/combo-production-schedule';
import { pinMissingScheduledProductionMonths } from '../lib/subscriptions/ensure-kanban-cycles';

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
  const admin = createAdminClient();
  const comboBackfill = await backfillPrepaidComboProductionSchedules(admin);
  const kitMonthsPinned = await pinMissingScheduledProductionMonths(admin);
  console.log(JSON.stringify({ comboBackfill, kitMonthsPinned }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
