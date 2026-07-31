import type { SupabaseClient } from '@supabase/supabase-js';
import { triggerAdminBrowserPush } from '@/lib/admin/trigger-browser-push';

export type AdminNotificationType =
  | 'store_order_payment_pending'
  | 'store_order_payment_approved'
  | 'store_order_payment_failed';

export type AdminNotificationRow = {
  id: string;
  type: AdminNotificationType;
  payment_id: string | null;
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

  const url = input.paymentId
    ? `/admin/loja/pedidos?paymentId=${encodeURIComponent(input.paymentId)}`
    : '/admin/loja/pedidos';

  void triggerAdminBrowserPush({
    title: input.title,
    body: input.body,
    url,
    tag: input.paymentId ?? input.orderId,
  });
}

export async function listAdminNotifications(
  admin: SupabaseClient,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<AdminNotificationRow[]> {
  const limit = options?.limit ?? 30;

  let query = admin
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options?.unreadOnly) {
    query = query.is('read_at', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[admin] list notifications:', error.message);
    return [];
  }

  return (data ?? []) as AdminNotificationRow[];
}

export async function countUnreadAdminNotifications(
  admin: SupabaseClient
): Promise<number> {
  const { count, error } = await admin
    .from('admin_notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);

  if (error) {
    console.error('[admin] count notifications:', error.message);
    return 0;
  }

  return count ?? 0;
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
  admin: SupabaseClient
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await admin
    .from('admin_notifications')
    .update({ read_at: now })
    .is('read_at', null);

  if (error) {
    console.error('[admin] mark all notifications read:', error.message);
  }
}
