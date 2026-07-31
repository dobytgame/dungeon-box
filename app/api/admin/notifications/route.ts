import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import {
  countUnreadAdminNotifications,
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from '@/lib/admin/notifications';

export async function GET(request: Request) {
  try {
    const { admin } = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === '1';
    const limit = Number.parseInt(searchParams.get('limit') ?? '30', 10);

    const [notifications, unreadCount] = await Promise.all([
      listAdminNotifications(admin, {
        limit: Number.isFinite(limit) ? limit : 30,
        unreadOnly,
      }),
      countUnreadAdminNotifications(admin),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { admin } = await requireAdmin();
    const body = (await request.json()) as {
      id?: string;
      markAll?: boolean;
    };

    if (body.markAll) {
      await markAllAdminNotificationsRead(admin);
      const unreadCount = await countUnreadAdminNotifications(admin);
      return NextResponse.json({ ok: true, unreadCount });
    }

    const id = body.id?.trim();
    if (!id) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    await markAdminNotificationRead(admin, id);
    const unreadCount = await countUnreadAdminNotifications(admin);
    return NextResponse.json({ ok: true, unreadCount });
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
}
