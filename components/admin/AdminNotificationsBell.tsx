'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Loader2, Monitor, ShoppingBag } from 'lucide-react';
import type { AdminNotificationRow } from '@/lib/admin/notifications';
import {
  resolveAdminNotificationHref,
} from '@/lib/admin/notification-display';
import {
  isAdminPushEnabledLocally,
  isBrowserPushSupported,
  subscribeAdminBrowserPush,
  syncAdminBrowserPushSubscription,
  unsubscribeAdminBrowserPush,
} from '@/lib/admin/push-client';
import { formatDateTime, formatMoney } from '@/lib/dashboard/format';

function notificationIcon(type: AdminNotificationRow['type']) {
  if (
    type === 'store_order_payment_approved' ||
    type === 'subscription_activated' ||
    type === 'subscription_renewal_paid'
  ) {
    return 'text-emerald-400';
  }
  if (
    type === 'store_order_payment_failed' ||
    type === 'subscription_payment_failed'
  ) {
    return 'text-red-400';
  }
  return 'text-amber-400';
}

export default function AdminNotificationsBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AdminNotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPushSupported(isBrowserPushSupported());
    setPushEnabled(isAdminPushEnabledLocally());
    void syncAdminBrowserPushSubscription();
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications?limit=20', {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: AdminNotificationRow[];
        unreadCount: number;
      };
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (error) {
      console.error('[admin] notifications fetch:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 180_000);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function markRead(id: string) {
    const res = await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { unreadCount: number };
    setUnreadCount(data.unreadCount ?? 0);
    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read_at: new Date().toISOString() } : item
      )
    );
  }

  async function markAllRead() {
    const res = await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { unreadCount: number };
    setUnreadCount(data.unreadCount ?? 0);
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => ({ ...item, read_at: item.read_at ?? now }))
    );
  }

  async function handleTogglePush() {
    setPushLoading(true);
    setPushError(null);
    try {
      if (pushEnabled) {
        await unsubscribeAdminBrowserPush();
        setPushEnabled(false);
      } else {
        await subscribeAdminBrowserPush();
        setPushEnabled(true);
      }
    } catch (error) {
      setPushError(
        error instanceof Error
          ? error.message
          : 'Não foi possível alterar as notificações do navegador.'
      );
    } finally {
      setPushLoading(false);
    }
  }

  async function handleOpen() {
    setOpen((value) => !value);
    if (!open) {
      await loadNotifications();
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => void handleOpen()}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-zinc-800 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console"
        aria-label={
          unreadCount > 0
            ? `${unreadCount} notificações não lidas`
            : 'Notificações'
        }
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-console px-1 font-mono text-[9px] font-medium text-zinc-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                Notificações
              </p>
              <p className="text-sm text-zinc-200">Loja e assinaturas</p>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500 transition hover:text-zinc-300"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Marcar lidas
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Carregando…
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                Nenhuma notificação ainda.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-800/80">
                {notifications.map((notification) => {
                  const unread = !notification.read_at;
                  return (
                    <li key={notification.id}>
                      <Link
                        href={resolveAdminNotificationHref({
                          type: notification.type,
                          paymentId: notification.payment_id,
                          orderId: notification.order_id,
                          subscriptionId: notification.subscription_id,
                        })}
                        onClick={() => {
                          if (unread) void markRead(notification.id);
                          setOpen(false);
                        }}
                        className={`block px-4 py-3 transition hover:bg-zinc-900/80 ${
                          unread ? 'bg-zinc-900/40' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <ShoppingBag
                            className={`mt-0.5 h-4 w-4 shrink-0 ${notificationIcon(notification.type)}`}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-zinc-100">
                              {notification.title}
                            </p>
                            {notification.body ? (
                              <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                                {notification.body}
                              </p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-zinc-600">
                              <span>{formatDateTime(notification.created_at)}</span>
                              {notification.amount_cents != null ? (
                                <span>{formatMoney(notification.amount_cents)}</span>
                              ) : null}
                              {unread ? (
                                <span className="rounded bg-console/15 px-1.5 py-0.5 font-mono uppercase tracking-[0.12em] text-console">
                                  Nova
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-zinc-800 px-4 py-3">
            {pushSupported ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => void handleTogglePush()}
                  disabled={pushLoading}
                  className="flex w-full items-center justify-between gap-2 rounded border border-zinc-800 px-3 py-2 text-left transition hover:border-zinc-700 hover:bg-zinc-900/60 disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2 text-xs text-zinc-300">
                    <Monitor className="h-3.5 w-3.5 text-console" aria-hidden="true" />
                    Notificações do Chrome
                  </span>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.12em] ${
                      pushEnabled ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                  >
                    {pushLoading ? '…' : pushEnabled ? 'Ativas' : 'Ativar'}
                  </span>
                </button>
                {pushError ? (
                  <p className="text-[11px] leading-relaxed text-red-400">{pushError}</p>
                ) : (
                  <p className="text-[11px] leading-relaxed text-zinc-600">
                    Receba alertas no navegador mesmo com o admin em segundo plano.
                  </p>
                )}
              </div>
            ) : null}
            <Link
              href="/admin/notificacoes"
              onClick={() => setOpen(false)}
              className="mt-2 block py-1 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500 transition hover:text-zinc-300"
            >
              Ver todas as notificações
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
