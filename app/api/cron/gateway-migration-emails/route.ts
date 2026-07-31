import { NextResponse } from 'next/server';
import { verifyCronSecret, unauthorizedCronResponse } from '@/lib/cron/auth';
import { processWeeklyMigrationEmails } from '@/lib/pagarme/migration-emails';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return unauthorizedCronResponse();
  }

  const admin = createAdminClient();
  const result = await processWeeklyMigrationEmails(admin);
  return NextResponse.json({ ok: true, ...result });
}
