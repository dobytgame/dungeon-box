'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AdminStoreOrderDetail } from '@/lib/admin/store-orders';

export function useAdminStoreOrderDetail(paymentId: string | null, enabled: boolean) {
  const [order, setOrder] = useState<AdminStoreOrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/store-orders/${encodeURIComponent(id)}`);
      const payload = (await response.json()) as
        | AdminStoreOrderDetail
        | { error?: string };

      if (!response.ok) {
        setError(
          'error' in payload ? payload.error ?? 'Erro ao carregar.' : 'Erro ao carregar.'
        );
        setOrder(null);
        return;
      }

      setOrder(payload as AdminStoreOrderDetail);
    } catch {
      setError('Falha ao carregar o pedido.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !paymentId) {
      setOrder(null);
      setError('');
      return;
    }

    void loadDetail(paymentId);
  }, [enabled, paymentId, loadDetail]);

  return {
    order,
    loading,
    error,
    loadDetail,
  };
}

export function storeOrderDetailTitle(
  order: AdminStoreOrderDetail | null,
  loading: boolean
): string {
  if (order?.kind === 'standalone') {
    const names = order.detail.storeOrderPurchases
      .flatMap((purchase) => purchase.items.map((item) => item.name))
      .slice(0, 2);
    if (names.length > 0) return names.join(', ');
    return 'Pedido avulso';
  }
  if (order?.kind === 'bundled') return order.itemsSummary;
  if (loading) return 'Carregando…';
  return 'Pedido da loja';
}

export function storeOrderDetailSubtitle(
  order: AdminStoreOrderDetail | null
): string | undefined {
  if (!order) return undefined;
  if (order.kind === 'standalone') {
    return order.detail.customerName ?? order.detail.customerEmail ?? undefined;
  }
  return order.customerName ?? order.customerEmail ?? undefined;
}
