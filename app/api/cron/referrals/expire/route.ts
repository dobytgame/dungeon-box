import { NextResponse } from 'next/server';
import { unauthorizedCronResponse, verifyCronSecret } from '@/lib/cron/auth';
import { processPointsExpiration } from '@/lib/referral/expire';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return unauthorizedCronResponse();
  }

  const result = await processPointsExpiration();

  return NextResponse.json({ ok: true, ...result });
}
