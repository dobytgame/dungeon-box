'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import AdminSheet from '@/components/admin/AdminSheet';
import CycleProductionPanel from '@/components/admin/CycleProductionPanel';
import ProductionPipeline from '@/components/admin/ProductionPipeline';
import DataRow from '@/components/dashboard/DataRow';
import StatusBadge from '@/components/dashboard/StatusBadge';
import type { AdminCycleDetailView } from '@/lib/admin/cycle-detail-view';
import { formatDate, formatDateTime, formatMoney, formatPhone } from '@/lib/dashboard/format';

interface Props {
  cycleId: string | null;
  open: boolean;
  onClose: () => void;
  onShipRequest: (detail: AdminCycleDetailView) => void;
  onUpdated?: () => void;
  disableEscape?: boolean;
}

export default function CycleDetailSheet({
  cycleId,
  open,
  onClose,
  onShipRequest,
  onUpdated,
  disableEscape = false,
}: Props) {
  const [detail, setDetail] = useState<AdminCycleDetailView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/cycles/${id}`);
      const payload = (await response.json()) as
        | AdminCycleDetailView
        | { error?: string };

      if (!response.ok) {
        setError('error' in payload ? payload.error ?? 'Erro ao carregar.' : 'Erro ao carregar.');
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
    if (!open || !cycleId) {
      setDetail(null);
      setError('');
      return;
    }

    void loadDetail(cycleId);
  }, [open, cycleId, loadDetail]);

  const title = detail
    ? `Ciclo #${detail.cycle_number}`
    : loading
      ? 'Carregando…'
      : 'Pedido';

  const subtitle = detail?.themeName ?? detail?.customerName ?? undefined;

  return (
    <AdminSheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      disableEscape={disableEscape}
    >
      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin text-console" aria-hidden="true" />
          <span className="sr-only">Carregando pedido</span>
        </div>
      ) : error ? (
        <div className="space-y-4">
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
          {cycleId ? (
            <button
              type="button"
              onClick={() => void loadDetail(cycleId)}
              className="cursor-pointer rounded border border-zinc-700 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-300"
            >
              Tentar novamente
            </button>
          ) : null}
        </div>
      ) : detail ? (
        <div className="space-y-6">
          <ProductionPipeline status={detail.status} />

          <section className="admin-panel rounded p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              Pedido
            </p>

            <dl className="mt-4">
              <DataRow
                label="Plano"
                value={
                  detail.orderPlan ? (
                    <span>
                      {detail.orderPlan.name}
                      <span className="block text-xs text-zinc-500">
                        {formatMoney(detail.orderPlan.priceCents)}/mês
                        {detail.orderPlan.piecesLabel
                          ? ` · ${detail.orderPlan.piecesLabel}`
                          : ''}
                      </span>
                    </span>
                  ) : (
                    detail.planName ?? '—'
                  )
                }
              />
              {detail.orderPromoCode ? (
                <DataRow label="Cupom" value={detail.orderPromoCode} />
              ) : null}
              <DataRow
                label="Frete mensal"
                value={
                  detail.orderShippingCents != null &&
                  detail.orderShippingCents > 0
                    ? `${formatMoney(detail.orderShippingCents)}/mês${
                        detail.orderShippingRegion
                          ? ` · ${detail.orderShippingRegion}`
                          : ''
                      }`
                    : 'Grátis'
                }
              />
              {detail.orderAddons.length > 0 ? (
                <DataRow
                  label="Adicionais"
                  value={
                    <ul className="space-y-2">
                      {detail.orderAddons.map((addon) => (
                        <li key={addon.id} className="text-sm text-zinc-300">
                          <span className="text-zinc-100">{addon.name}</span>
                          <span className="block text-xs text-zinc-500">
                            {addon.priceLabel}
                            {addon.billing === 'recurring'
                              ? ' · recorrente todo mês'
                              : ' · cobrança única na 1ª caixa'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  }
                />
              ) : (
                <DataRow label="Adicionais" value="Nenhum" />
              )}
              {detail.orderMonthlyTotalCents != null ? (
                <DataRow
                  label="Total recorrente"
                  value={`${formatMoney(detail.orderMonthlyTotalCents)}/mês`}
                />
              ) : null}
              {detail.orderCustomerNotes ? (
                <DataRow
                  label="Observações do cliente"
                  value={detail.orderCustomerNotes}
                />
              ) : null}
            </dl>
          </section>

          {detail.orderAddress ? (
            <section className="admin-panel rounded p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                Endereço de entrega
              </p>
              <dl className="mt-4">
                <DataRow label="Destinatário" value={detail.orderAddress.recipient} />
                {detail.orderAddress.label ? (
                  <DataRow label="Identificação" value={detail.orderAddress.label} />
                ) : null}
                <DataRow
                  label="Logradouro"
                  value={`${detail.orderAddress.street}, ${detail.orderAddress.number}`}
                />
                {detail.orderAddress.complement ? (
                  <DataRow label="Complemento" value={detail.orderAddress.complement} />
                ) : null}
                <DataRow label="Bairro" value={detail.orderAddress.neighborhood} />
                <DataRow
                  label="Cidade / UF"
                  value={`${detail.orderAddress.city}/${detail.orderAddress.state}`}
                />
                <DataRow label="CEP" value={detail.orderAddress.zipCode} mono />
              </dl>
            </section>
          ) : null}

          <section className="admin-panel rounded p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                  Resumo
                </p>
                <p className="mt-1 text-sm text-zinc-300">
                  {detail.customerName ?? 'Cliente sem nome'}
                </p>
              </div>
              <StatusBadge kind="cycle" status={detail.status} />
            </div>

            <dl className="mt-4">
              <DataRow
                label="Cliente"
                value={
                  detail.customerEmail && detail.userId ? (
                    <Link
                      href={`/admin/clientes/${detail.userId}`}
                      className="text-console hover:underline"
                    >
                      {detail.customerName ?? detail.customerEmail}
                    </Link>
                  ) : (
                    detail.customerName ?? '—'
                  )
                }
              />
              <DataRow label="E-mail" value={detail.customerEmail} />
              <DataRow label="Telefone" value={formatPhone(detail.customerPhone)} />
              <DataRow
                label="Assinatura"
                value={
                  detail.subscriptionId ? (
                    <Link
                      href={`/admin/assinaturas/${detail.subscriptionId}`}
                      className="text-console hover:underline"
                    >
                      {detail.planName ?? detail.subscriptionId}
                    </Link>
                  ) : (
                    '—'
                  )
                }
              />
              <DataRow label="Valor do ciclo" value={formatMoney(detail.amount_cents ?? 0)} />
              <DataRow label="Pago em" value={formatDate(detail.paid_at)} />
              <DataRow label="Transportadora" value={detail.carrier} />
              <DataRow label="Rastreio" value={detail.tracking_code} mono />
              <DataRow label="Enviado em" value={formatDateTime(detail.shipped_at)} />
              <DataRow label="Entregue em" value={formatDateTime(detail.delivered_at)} />
              <DataRow label="Cancelado em" value={formatDateTime(detail.cancelled_at)} />
              <DataRow label="Motivo cancelamento" value={detail.cancel_reason} />
              <DataRow label="Notas de produção" value={detail.production_notes} />
              <DataRow label="Previsão entrega" value={formatDate(detail.estimated_delivery)} />
              {detail.themeName ? (
                <DataRow label="Tema do ciclo" value={detail.themeName} />
              ) : null}
            </dl>
          </section>

          <CycleProductionPanel
            cycleId={detail.id}
            status={detail.status}
            defaultCarrier={detail.carrier ?? 'Correios'}
            cancelReason={detail.cancel_reason}
            productionNotes={detail.production_notes}
            shipMode="modal"
            onShipRequest={() => onShipRequest(detail)}
            onUpdated={() => {
              onUpdated?.();
              void loadDetail(detail.id);
            }}
          />
        </div>
      ) : null}
    </AdminSheet>
  );
}
