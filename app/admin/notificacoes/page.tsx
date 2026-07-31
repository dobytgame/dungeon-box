import { requireAdmin } from '@/lib/admin/auth';
import type { AdminNotificationCategory } from '@/lib/admin/notification-display';
import {
  countAdminNotifications,
  countUnreadAdminNotifications,
  listAdminNotifications,
} from '@/lib/admin/notifications';
import AdminNotificationsPageClient from '@/components/admin/AdminNotificationsPageClient';

interface Props {
  searchParams: Promise<{
    category?: string;
    unread?: string;
  }>;
}

function parseCategory(value?: string): AdminNotificationCategory {
  if (value === 'store' || value === 'subscription') return value;
  return 'all';
}

export default async function AdminNotificationsPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const { category: categoryParam, unread } = await searchParams;
  const category = parseCategory(categoryParam);
  const unreadOnly = unread === '1';

  const [notifications, unreadCount, totalCount] = await Promise.all([
    listAdminNotifications(admin, {
      limit: 200,
      unreadOnly,
      category,
    }),
    countUnreadAdminNotifications(admin, category),
    countAdminNotifications(admin, { category }),
  ]);

  return (
    <AdminNotificationsPageClient
      notifications={notifications}
      unreadCount={unreadCount}
      totalCount={totalCount}
      category={category}
      unreadOnly={unreadOnly}
    />
  );
}
