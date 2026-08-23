import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAdminClient } from '../lib/supabase/admin';
import { repairMonthlyProductionForSubscription } from '../lib/subscriptions/monthly-production-schedule';

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

async function main() {
  const ids = process.argv.slice(2);
  if (!ids.length) {
    console.error('Usage: npx tsx scripts/repair-subscription-cycles.ts <id>...');
    process.exit(1);
  }
  const admin = createAdminClient();
  for (const id of ids) {
    const result = await repairMonthlyProductionForSubscription(admin, id);
    console.log(JSON.stringify({ id, ...result }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
