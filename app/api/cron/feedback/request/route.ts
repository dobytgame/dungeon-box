import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { unauthorizedCronResponse, verifyCronSecret } from '@/lib/cron/auth';
import { sendPendingFeedbackRequestEmails } from '@/lib/feedback/request-emails';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return unauthorizedCronResponse();
  }

  const supabase = createAdminClient();
  const result = await sendPendingFeedbackRequestEmails(supabase);

  return NextResponse.json({ ok: true, ...result });
}
