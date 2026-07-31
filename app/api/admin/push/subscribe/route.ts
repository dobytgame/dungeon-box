import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import {
  deleteAdminPushSubscription,
  isWebPushConfigured,
  upsertAdminPushSubscription,
} from '@/lib/admin/push-notifications';

type PushSubscriptionBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(request: Request) {
  try {
    const { user, admin } = await requireAdmin();

    if (!isWebPushConfigured()) {
      return NextResponse.json(
        { error: 'Web Push não configurado no servidor.' },
        { status: 503 }
      );
    }

    const body = (await request.json()) as PushSubscriptionBody;
    const endpoint = body.endpoint?.trim();
    const p256dh = body.keys?.p256dh?.trim();
    const auth = body.keys?.auth?.trim();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: 'Inscrição push inválida.' },
        { status: 400 }
      );
    }

    await upsertAdminPushSubscription(admin, {
      userId: user.id,
      endpoint,
      p256dh,
      auth,
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { admin } = await requireAdmin();
    const body = (await request.json()) as { endpoint?: string };
    const endpoint = body.endpoint?.trim();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint inválido.' }, { status: 400 });
    }

    await deleteAdminPushSubscription(admin, endpoint);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
}
