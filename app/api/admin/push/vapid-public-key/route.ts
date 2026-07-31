import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getVapidPublicKey, isWebPushConfigured } from '@/lib/admin/push-notifications';

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: 'Web Push não configurado no servidor.' },
      { status: 503 }
    );
  }

  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: 'Chave pública indisponível.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ publicKey });
}
