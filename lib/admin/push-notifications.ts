import type { SupabaseClient } from '@supabase/supabase-js';
import webpush from 'web-push';

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

let vapidConfigured = false;

function configureVapid(): boolean {
  if (vapidConfigured) return true;

  const publicKey =
    process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT?.trim() ?? 'mailto:mestre@dungeonbox.com.br';

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return (
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ??
    process.env.VAPID_PUBLIC_KEY ??
    null
  );
}

export function isWebPushConfigured(): boolean {
  return Boolean(getVapidPublicKey() && process.env.VAPID_PRIVATE_KEY);
}

export async function sendAdminBrowserPush(
  admin: SupabaseClient,
  payload: {
    title: string;
    body?: string | null;
    url?: string;
    tag?: string;
  }
): Promise<void> {
  if (!configureVapid()) return;

  const { data: subscriptions, error } = await admin
    .from('admin_push_subscriptions')
    .select('id, endpoint, p256dh, auth');

  if (error) {
    console.error('[admin] list push subscriptions:', error.message);
    return;
  }

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body ?? '',
    url: payload.url ?? '/admin/loja/pedidos',
    tag: payload.tag,
  });

  await Promise.all(
    (subscriptions ?? []).map(async (row: PushSubscriptionRow) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth,
            },
          },
          message
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin
            .from('admin_push_subscriptions')
            .delete()
            .eq('id', row.id);
        }
        console.error('[admin] push send failed:', row.endpoint, error);
      }
    })
  );
}

export async function upsertAdminPushSubscription(
  admin: SupabaseClient,
  input: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string | null;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await admin.from('admin_push_subscriptions').upsert(
    {
      user_id: input.userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      user_agent: input.userAgent ?? null,
      updated_at: now,
    },
    { onConflict: 'endpoint' }
  );

  if (error) {
    console.error('[admin] upsert push subscription:', error.message);
    throw new Error('Não foi possível salvar a inscrição push.');
  }
}

export async function deleteAdminPushSubscription(
  admin: SupabaseClient,
  endpoint: string
): Promise<void> {
  const { error } = await admin
    .from('admin_push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  if (error) {
    console.error('[admin] delete push subscription:', error.message);
  }
}
