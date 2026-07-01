import { NextResponse } from 'next/server';
import { reconcileAllPendingAsaasSubscriptions } from '@/lib/asaas/reconcile-pending';
import { createAdminClient } from '@/lib/supabase/admin';
import { unauthorizedCronResponse, verifyCronSecret } from '@/lib/cron/auth';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return unauthorizedCronResponse();
  }

  const supabase = createAdminClient();
  const activated = await reconcileAllPendingAsaasSubscriptions(supabase, {
    limit: 200,
  });

  return NextResponse.json({ ok: true, activated });
}
