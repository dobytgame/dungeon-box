import type { SupabaseClient } from '@supabase/supabase-js';
import {
  adminNotificationMatchesCategory,
  resolveAdminNotificationHref,
  type AdminNotificationCategory,
} from '@/lib/admin/notification-display';
import { triggerAdminBrowserPush } from '@/lib/admin/trigger-browser-push';

export type AdminNotificationType =
  | 'store_order_payment_pending'
  | 'store_order_payment_approved'
  | 'store_order_payment_failed'
  | 'subscription_pending'
  | 'subscription_activated'
  | 'subscription_payment_failed'
  | 'subscription_renewal_paid'
  | 'subscription_cancelled';

export type AdminNotificationRow = {
  id: string;
  type: AdminNotificationType;
  payment_id: string | null;
  subscription_id: string | null;
  order_id: string;
  user_id: string | null;
  title: string;
  body: string | null;
  amount_cents: number | null;
  payment_method: string | null;
  gateway: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export async function createAdminNotification(
  admin: SupabaseClient,
  input: {
    type: AdminNotificationType;
    paymentId?: string | null;
    subscriptionId?: string | null;
    orderId: string;
    userId?: string | null;
    title: string;
    body?: string | null;
    amountCents?: number | null;
    paymentMethod?: string | null;
    gateway?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const row = {
    type: input.type,
    payment_id: input.paymentId ?? null,
    subscription_id: input.subscriptionId ?? null,
    order_id: input.orderId,
    user_id: input.userId ?? null,
    title: input.title,
    body: input.body ?? null,
    amount_cents: input.amountCents ?? null,
    payment_method: input.paymentMethod ?? null,
    gateway: input.gateway ?? null,
    metadata: input.metadata ?? {},
  };

  const { error } = await admin.from('admin_notifications').insert(row);

  if (error) {
    if (error.code === '23505') return;
    console.error('[admin] create notification:', input.type, error.message);
    return;
  }

  const url = resolveAdminNotificationHref({
    type: input.type,
    paymentId: input.paymentId,
    orderId: input.orderId,
    subscriptionId: input.subscriptionId,
  });

  void triggerAdminBrowserPush({
    title: input.title,
    body: input.body,
    url,
    tag: input.paymentId ?? input.subscriptionId ?? input.orderId,
  });
}

export async function listAdminNotifications(
  admin: SupabaseClient,
  options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    category?: AdminNotificationCategory;
  }
): Promise<AdminNotificationRow[]> {
  const limit = options?.limit ?? 30;
  const offset = options?.offset ?? 0;

  let query = admin
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.unreadOnly) {
    query = query.is('read_at', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[admin] list notifications:', error.message);
    return [];
  }

  const rows = (data ?? []) as AdminNotificationRow[];
  const category = options?.category ?? 'all';

  return rows.filter((row) => adminNotificationMatchesCategory(row.type, category));
}

export async function countAdminNotifications(
  admin: SupabaseClient,
  options?: { unreadOnly?: boolean; category?: AdminNotificationCategory }
): Promise<number> {
  const { data, error } = await admin
    .from('admin_notifications')
    .select('id, type, read_at')
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error) {
    console.error('[admin] count notifications:', error.message);
    return 0;
  }

  const category = options?.category ?? 'all';

  return (data ?? []).filter((row) => {
    if (options?.unreadOnly && row.read_at) return false;
    return adminNotificationMatchesCategory(row.type as AdminNotificationType, category);
  }).length;
}

export async function countUnreadAdminNotifications(
  admin: SupabaseClient,
  category?: AdminNotificationCategory
): Promise<number> {
  return countAdminNotifications(admin, { unreadOnly: true, category });
}

export async function markAdminNotificationRead(
  admin: SupabaseClient,
  notificationId: string
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await admin
    .from('admin_notifications')
    .update({ read_at: now })
    .eq('id', notificationId)
    .is('read_at', null);

  if (error) {
    console.error('[admin] mark notification read:', notificationId, error.message);
  }
}

export async function markAllAdminNotificationsRead(
  admin: SupabaseClient,
  category?: AdminNotificationCategory
): Promise<void> {
  if (!category || category === 'all') {
    const now = new Date().toISOString();
    const { error } = await admin
      .from('admin_notifications')
      .update({ read_at: now })
      .is('read_at', null);

    if (error) {
      console.error('[admin] mark all notifications read:', error.message);
    }
    return;
  }

  const { data: rows } = await admin
    .from('admin_notifications')
    .select('id, type, read_at')
    .is('read_at', null)
    .limit(5000);

  const ids = (rows ?? [])
    .filter((row) =>
      adminNotificationMatchesCategory(row.type as AdminNotificationType, category)
    )
    .map((row) => row.id as string);

  if (ids.length === 0) return;

  const now = new Date().toISOString();
  const { error } = await admin
    .from('admin_notifications')
    .update({ read_at: now })
    .in('id', ids);

  if (error) {
    console.error('[admin] mark category notifications read:', error.message);
  }
}
