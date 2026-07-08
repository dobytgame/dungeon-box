'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AdminCycleDetailView } from '@/lib/admin/cycle-detail-view';

export function useAdminCycleDetail(cycleId: string | null, enabled: boolean) {
  const [detail, setDetail] = useState<AdminCycleDetailView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/cycles/${encodeURIComponent(id)}`);
      const payload = (await response.json()) as
        | AdminCycleDetailView
        | { error?: string };

      if (!response.ok) {
        setError(
          'error' in payload ? payload.error ?? 'Erro ao carregar.' : 'Erro ao carregar.'
        );
        setDetail(null);
        return;
      }

      setDetail(payload as AdminCycleDetailView);
    } catch {
      setError('Falha ao carregar o pedido.');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !cycleId) {
      setDetail(null);
      setError('');
      return;
    }

    void loadDetail(cycleId);
  }, [enabled, cycleId, loadDetail]);

  return {
    detail,
    loading,
    error,
    loadDetail,
    setDetail,
  };
}

export function cycleDetailTitle(
  detail: AdminCycleDetailView | null,
  loading: boolean
): string {
  if (detail?.isStandaloneStoreOrder) return 'Loja avulsa';
  if (detail) return `Ciclo #${detail.cycle_number}`;
  if (loading) return 'Carregando…';
  return 'Pedido';
}

export function cycleDetailSubtitle(detail: AdminCycleDetailView | null): string | undefined {
  return detail?.themeName ?? detail?.customerName ?? undefined;
}
