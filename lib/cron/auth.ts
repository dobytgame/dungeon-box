import { NextResponse } from 'next/server';

export function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export function unauthorizedCronResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
