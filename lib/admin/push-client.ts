'use client';

const SW_PATH = '/admin-sw.js';
const STORAGE_KEY = 'dungeonbox.admin.push.enabled';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isBrowserPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isAdminPushEnabledLocally(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === '1';
}

export function setAdminPushEnabledLocally(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

async function fetchVapidPublicKey(): Promise<string> {
  const res = await fetch('/api/admin/push/vapid-public-key', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Push não configurado no servidor.');
  }
  const data = (await res.json()) as { publicKey?: string };
  if (!data.publicKey) {
    throw new Error('Chave VAPID indisponível.');
  }
  return data.publicKey;
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_PATH, { scope: '/' });
}

export async function subscribeAdminBrowserPush(): Promise<NotificationPermission> {
  if (!isBrowserPushSupported()) {
    throw new Error('Este navegador não suporta notificações push.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permissão de notificação negada.');
  }

  const publicKey = await fetchVapidPublicKey();
  const registration = await getServiceWorkerRegistration();
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const res = await fetch('/api/admin/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? 'Não foi possível ativar as notificações.');
  }

  setAdminPushEnabledLocally(true);
  return permission;
}

export async function unsubscribeAdminBrowserPush(): Promise<void> {
  if (!isBrowserPushSupported()) return;

  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();

  if (subscription) {
    await fetch('/api/admin/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => undefined);

    await subscription.unsubscribe();
  }

  setAdminPushEnabledLocally(false);
}

export async function syncAdminBrowserPushSubscription(): Promise<void> {
  if (!isBrowserPushSupported()) return;
  if (!isAdminPushEnabledLocally()) return;
  if (Notification.permission !== 'granted') return;

  try {
    await subscribeAdminBrowserPush();
  } catch (error) {
    console.error('[admin] push sync failed:', error);
  }
}
