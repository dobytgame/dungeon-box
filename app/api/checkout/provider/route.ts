import { NextResponse } from 'next/server';
import { getActivePaymentProvider } from '@/lib/payments/provider';

export const runtime = 'nodejs';

export async function GET() {
  const provider = await getActivePaymentProvider();
  return NextResponse.json({ provider });
}
