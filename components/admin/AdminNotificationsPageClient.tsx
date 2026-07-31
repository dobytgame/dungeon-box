'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { CheckCheck, Loader2 } from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import type { AdminNotificationRow } from '@/lib/admin/notifications';
import {
  adminNotificationCategoryLabel,
  adminNotificationTypeLabel,
  getAdminNotificationCategory,
  resolveAdminNotificationHref,
  type AdminNotificationCategory,
} from '@/lib/admin/notification-display';
import { formatDateTime, formatMoney } from '@/lib/dashboard/format';

const CATEGORY_TABS: Array<{ value: AdminNotificationCategory; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'store', label: 'Loja' },
  { value: 'subscription', label: 'Assinaturas' },
];

interface Props {
  notifications: AdminNotificationRow[];
  unreadCount: number;
  totalCount: number;
  category: AdminNotificationCategory;
  unreadOnly: boolean;
}

export default function AdminNotificationsPageClient({
  notifications: initialNotifications,
  unreadCount: initialUnreadCount,
  totalCount,
  category,
  unreadOnly,
}: Props) {
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  async function markRead(id: string) {
    const res = await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, category }),
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
      body: JSON.stringify({ markAll: true, category }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { unreadCount: number };
    setUnreadCount(data.unreadCount ?? 0);
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => ({ ...item, read_at: item.read_at ?? now }))
    );
    refresh();
  }

  async function sendTest(kind: 'store' | 'subscription') {
    setTestLoading(true);
    setTestMessage(null);
    try {
      const res = await fetch(
        `/api/admin/notifications/test?kind=${kind}`,
        { method: 'POST' }
      );
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        pushConfigured?: boolean;
      };
      if (!res.ok) {
        setTestMessage(data.error ?? 'Falha ao enviar teste.');
        return;
      }
      setTestMessage(
        data.pushConfigured
          ? 'Teste enviado. Confira o sino e a notificação do Chrome.'
          : 'Teste enviado no painel. Push do Chrome não configurado no servidor.'
      );
      refresh();
    } catch {
      setTestMessage('Falha ao enviar notificação de teste.');
    } finally {
      setTestLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_TABS.map((tab) => {
            const params = new URLSearchParams();
            params.set('category', tab.value);
            if (unreadOnly) params.set('unread', '1');
            return (
              <Link
                key={tab.value}
                href={`/admin/notificacoes?${params.toString()}`}
                className={`rounded border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition ${
                  category === tab.value
                    ? 'border-console/40 bg-console/10 text-console'
                    : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void sendTest('store')}
            disabled={testLoading || pending}
            className="rounded border border-zinc-800 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300 disabled:opacity-60"
          >
            Teste loja
          </button>
          <button
            type="button"
            onClick={() => void sendTest('subscription')}
            disabled={testLoading || pending}
            className="rounded border border-zinc-800 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300 disabled:opacity-60"
          >
            Teste assinatura
          </button>
          <Link
            href={`/admin/notificacoes?category=${category}${unreadOnly ? '' : '&unread=1'}`}
            className="rounded border border-zinc-800 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300"
          >
            {unreadOnly ? 'Ver todas' : 'Só não lidas'}
          </Link>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded border border-zinc-800 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300 disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Marcar lidas
            </button>
          ) : null}
        </div>
      </div>

      {testMessage ? (
        <p className="rounded border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400">
          {testMessage}
        </p>
      ) : null}

      <AdminTable
        rows={notifications}
        getRowHref={(row) =>
          resolveAdminNotificationHref({
            type: row.type,
            paymentId: row.payment_id,
            orderId: row.order_id,
            subscriptionId: row.subscription_id,
          })
        }
        onRowClick={(row) => {
          if (!row.read_at) void markRead(row.id);
        }}
        columns={[
          {
            key: 'status',
            header: '',
            className: 'w-8',
            cell: (row) =>
              !row.read_at ? (
                <span
                  className="inline-block h-2 w-2 rounded-full bg-console"
                  aria-label="Não lida"
                />
              ) : (
                <span className="inline-block h-2 w-2 rounded-full bg-zinc-800" />
              ),
          },
          {
            key: 'category',
            header: 'Origem',
            cell: (row) => (
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                {adminNotificationCategoryLabel(getAdminNotificationCategory(row.type))}
              </span>
            ),
          },
          {
            key: 'title',
            header: 'Evento',
            cell: (row) => (
              <div>
                <p className="text-zinc-100">{row.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {adminNotificationTypeLabel(row.type)}
                </p>
              </div>
            ),
          },
          {
            key: 'body',
            header: 'Detalhes',
            cell: (row) => (
              <p className="max-w-md truncate text-zinc-400">{row.body ?? '—'}</p>
            ),
          },
          {
            key: 'amount',
            header: 'Valor',
            className: 'tabular-nums',
            cell: (row) =>
              row.amount_cents != null ? formatMoney(row.amount_cents) : '—',
          },
          {
            key: 'created',
            header: 'Quando',
            cell: (row) => formatDateTime(row.created_at),
          },
        ]}
        emptyMessage="Nenhuma notificação neste filtro."
      />

      <p className="text-xs text-zinc-600">
        {notifications.length} exibida(s) · {totalCount} no total
        {unreadCount > 0 ? ` · ${unreadCount} não lida(s)` : ''}
      </p>
    </div>
  );
}
