import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import type { AdminNotificationCategory } from '@/lib/admin/notification-display';
import {
  countAdminNotifications,
  countUnreadAdminNotifications,
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from '@/lib/admin/notifications';

function parseCategory(value: string | null): AdminNotificationCategory {
  if (value === 'store' || value === 'subscription') return value;
  return 'all';
}

export async function GET(request: Request) {
  try {
    const { admin } = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === '1';
    const category = parseCategory(searchParams.get('category'));
    const limit = Number.parseInt(searchParams.get('limit') ?? '30', 10);
    const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10);

    const [notifications, unreadCount, totalCount] = await Promise.all([
      listAdminNotifications(admin, {
        limit: Number.isFinite(limit) ? limit : 30,
        offset: Number.isFinite(offset) ? offset : 0,
        unreadOnly,
        category,
      }),
      countUnreadAdminNotifications(admin, category),
      countAdminNotifications(admin, { category }),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
      totalCount,
    });
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
      category?: AdminNotificationCategory;
    };

    const category = body.category ?? 'all';

    if (body.markAll) {
      await markAllAdminNotificationsRead(admin, category);
      const unreadCount = await countUnreadAdminNotifications(admin, category);
      return NextResponse.json({ ok: true, unreadCount });
    }

    const id = body.id?.trim();
    if (!id) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    await markAdminNotificationRead(admin, id);
    const unreadCount = await countUnreadAdminNotifications(admin, category);
    return NextResponse.json({ ok: true, unreadCount });
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
}
