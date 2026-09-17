import { NextResponse } from 'next/server';
import { getCustomStoreOrderByToken } from '@/lib/store/custom-order';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')?.trim() ?? '';
  if (!token) {
    return NextResponse.json({ error: 'Link inválido.' }, { status: 400 });
  }

  const result = await getCustomStoreOrderByToken(token);
  if ('error' in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json(result);
}
