import { NextResponse } from 'next/server';
import { getActivePaymentProvider } from '@/lib/payments/provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const provider = await getActivePaymentProvider();
  return NextResponse.json(
    { provider },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
