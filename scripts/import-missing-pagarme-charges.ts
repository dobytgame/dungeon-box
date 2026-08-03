import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAdminClient } from '../lib/supabase/admin';
import { importMissingPagarmeCharges } from '../lib/pagarme/import-charges';

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
  const from = process.argv[2] ?? '2026-08-03';
  const to = process.argv[3] ?? from;
  const admin = createAdminClient();
  const result = await importMissingPagarmeCharges(admin, from, to);
  console.log(JSON.stringify({ from, to, ...result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
