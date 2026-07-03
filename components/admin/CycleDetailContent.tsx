'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import CopyableDataRow from '@/components/admin/CopyableDataRow';
import CycleBundledTags from '@/components/admin/CycleBundledTags';
import CycleProductionPanel from '@/components/admin/CycleProductionPanel';
import CycleProductionNotesForm from '@/components/admin/CycleProductionNotesForm';
import CycleShippingCostForm from '@/components/admin/CycleShippingCostForm';
import ProductionChecklist from '@/components/admin/ProductionChecklist';
import ProductionPipeline from '@/components/admin/ProductionPipeline';
import DataRow from '@/components/dashboard/DataRow';
import StatusBadge from '@/components/dashboard/StatusBadge';
import type { AdminCycleDetailView } from '@/lib/admin/cycle-detail-view';
import { formatDate, formatDateTime, formatMoney, formatPhone, formatCpf } from '@/lib/dashboard/format';

interface Props {
  cycleId: string | null;
  detail: AdminCycleDetailView | null;
  loading: boolean;
  error: string;
  onRetry?: () => void;
  onShipRequest: (detail: AdminCycleDetailView) => void;
  onUpdated?: () => void;
  onReload?: (cycleId: string) => void;
}

export default function CycleDetailContent({
  cycleId,
  detail,
  loading,
  error,
  onRetry,
  onShipRequest,
  onUpdated,
  onReload,
}: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin text-console" aria-hidden="true" />
        <span className="sr-only">Carregando pedido</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
        {cycleId && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="cursor-pointer rounded border border-zinc-700 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-300"
          >
            Tentar novamente
          </button>
        ) : null}
      </div>
    );
  }

  if (!detail) return null;

  const customerCpf = formatCpf(detail.customerCpf);
  const customerCpfDigits = detail.customerCpf?.replace(/\D/g, '') ?? '';
  const customerPhone = formatPhone(detail.customerPhone);
  const extraCount = Math.max(0, detail.productionChecklist.length - 1);

  return (
    <div className="space-y-6">
      <ProductionPipeline status={detail.status} />

      {detail.status !== 'cancelled' ? (
        <section className="admin-panel rounded border-amber-500/20 p-4 md:p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-200/90">
            Comentários do pedido
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Instruções ou observações visíveis em destaque nos cards do kanban.
          </p>
          <div className="mt-4">
            <CycleProductionNotesForm
              cycleId={detail.id}
              productionNotes={detail.production_notes}
              onSuccess={() => {
                onUpdated?.();
                onReload?.(detail.id);
              }}
            />
          </div>
        </section>
      ) : detail.production_notes ? (
        <section className="admin-panel rounded border-amber-500/20 p-4 md:p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-200/90">
            Comentários do pedido
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            {detail.production_notes}
          </p>
        </section>
      ) : null}

      <section className="admin-panel rounded p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              Resumo de produção
            </p>
            <h3 className="mt-1 text-base font-medium text-zinc-100">
              Ciclo #{detail.cycle_number}
              {detail.themeName ? ` · ${detail.themeName}` : ''}
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              {detail.customerName ?? 'Cliente sem nome'}
              {extraCount > 0
                ? ` · ${detail.productionChecklist.length} itens para montar`
                : ' · somente caixa do plano'}
            </p>
          </div>
          <StatusBadge kind="cycle" status={detail.status} />
        </div>

        <div className="mt-4">
          <ProductionChecklist items={detail.productionChecklist} />
        </div>

        {detail.shipmentItems.length > 0 ? (
          <div className="mt-4 border-t border-zinc-800/80 pt-4">
            <CycleBundledTags items={detail.shipmentItems} compact />
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="admin-panel rounded p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            Assinatura
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
                detail.orderShippingCents != null && detail.orderShippingCents > 0
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
                label="Add-on na assinatura"
                value={
                  <ul className="space-y-2">
                    {detail.orderAddons.map((addon) => (
                      <li key={addon.id} className="text-sm text-zinc-300">
                        <span className="text-zinc-100">{addon.name}</span>
                        <span className="block text-xs text-zinc-500">
                          {addon.priceLabel}
                          {addon.billing === 'recurring'
                            ? ' · recorrente todo mês'
                            : ' · cobrança única'}
                        </span>
                      </li>
                    ))}
                  </ul>
                }
              />
            ) : null}
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
              <CopyableDataRow
                label="Destinatário"
                value={detail.orderAddress.recipient}
              />
              <CopyableDataRow label="CPF" value={customerCpf} copyValue={customerCpfDigits} mono />
              {detail.orderAddress.label ? (
                <CopyableDataRow
                  label="Identificação"
                  value={detail.orderAddress.label}
                />
              ) : null}
              <CopyableDataRow
                label="Logradouro"
                value={`${detail.orderAddress.street}, ${detail.orderAddress.number}`}
              />
              {detail.orderAddress.complement ? (
                <CopyableDataRow
                  label="Complemento"
                  value={detail.orderAddress.complement}
                />
              ) : null}
              <CopyableDataRow
                label="Bairro"
                value={detail.orderAddress.neighborhood}
              />
              <CopyableDataRow
                label="Cidade / UF"
                value={`${detail.orderAddress.city}/${detail.orderAddress.state}`}
              />
              <CopyableDataRow
                label="CEP"
                value={detail.orderAddress.zipCode}
                copyValue={detail.orderAddress.zipCode.replace(/\D/g, '')}
                mono
              />
            </dl>
          </section>
        ) : null}
      </div>

      {!detail.isPartner && detail.shipmentFinance ? (
        <section className="admin-panel rounded p-4 md:p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            Financeiro do envio
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Receita e margem considerando assinatura e itens extras enviados
            neste pacote.
          </p>

          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                Receita
              </p>
              <ul className="mt-2 space-y-2">
                {detail.shipmentFinance.revenueLines.map((line) => (
                  <li
                    key={line.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 text-zinc-400">{line.label}</span>
                    <span className="shrink-0 font-mono text-xs text-zinc-200">
                      {formatMoney(line.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3 text-sm">
                <span className="text-zinc-300">Total receita</span>
                <span className="font-mono text-zinc-100">
                  {formatMoney(detail.shipmentFinance.totalRevenueCents)}
                </span>
              </div>
            </div>

            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                Custos
              </p>
              <ul className="mt-2 space-y-2">
                {detail.shipmentFinance.productionCostLines.map((line) => (
                  <li
                    key={line.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 text-zinc-400">{line.label}</span>
                    <span className="shrink-0 font-mono text-xs text-zinc-200">
                      {formatMoney(line.amountCents)}
                    </span>
                  </li>
                ))}
                <li className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-zinc-400">Envio (real)</span>
                  <span className="shrink-0 font-mono text-xs text-zinc-200">
                    {detail.shippingCostCents != null
                      ? formatMoney(detail.shippingCostCents)
                      : '—'}
                  </span>
                </li>
              </ul>
              {detail.kitMarginCents != null ? (
                <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3 text-sm">
                  <span className="text-zinc-300">Margem do envio</span>
                  <span
                    className={`font-mono ${
                      detail.kitMarginCents >= 0
                        ? 'text-emerald-300'
                        : 'text-red-400'
                    }`}
                  >
                    {formatMoney(detail.kitMarginCents)}
                    {detail.shippingCostCents == null
                      ? ' · sem custo de envio'
                      : ''}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {detail.pendingBundledOrders.length > 0 ? (
            <div className="mt-4 rounded border border-amber-500/25 bg-amber-500/5 px-3 py-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-amber-300/90">
                Aguardando pagamento — fora da produção
              </p>
              <ul className="mt-2 space-y-1">
                {detail.pendingBundledOrders.map((line) => (
                  <li
                    key={line.id}
                    className="flex items-start justify-between gap-3 text-sm text-amber-200/80"
                  >
                    <span className="min-w-0">{line.label}</span>
                    <span className="shrink-0 font-mono text-xs">
                      {formatMoney(line.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="admin-panel rounded p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
          Dados do pedido
        </p>

        <dl className="mt-4 grid gap-0 md:grid-cols-2 md:gap-x-6">
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
          <CopyableDataRow
            label="E-mail"
            value={detail.customerEmail}
          />
          <CopyableDataRow
            label="Telefone"
            value={customerPhone}
            copyValue={detail.customerPhone?.replace(/\D/g, '') ?? ''}
            mono
          />
          {!detail.orderAddress ? (
            <CopyableDataRow
              label="CPF"
              value={customerCpf}
              copyValue={customerCpfDigits}
              mono
            />
          ) : null}
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
          <DataRow label="Valor do ciclo" value={
            detail.isPartner
              ? 'Parceiro — sem cobrança'
              : formatMoney(detail.amount_cents ?? 0)
          } />
          <DataRow
            label="Pago em"
            value={
              detail.isPartner
                ? detail.paid_at
                  ? `${formatDate(detail.paid_at)} (parceiro)`
                  : 'Parceiro — isento'
                : formatDate(detail.paid_at)
            }
          />
          <DataRow label="Transportadora" value={detail.carrier} />
          <DataRow label="Rastreio" value={detail.tracking_code} mono />
          <DataRow label="Enviado em" value={formatDateTime(detail.shipped_at)} />
          <DataRow label="Entregue em" value={formatDateTime(detail.delivered_at)} />
          <DataRow label="Cancelado em" value={formatDateTime(detail.cancelled_at)} />
          <DataRow label="Motivo cancelamento" value={detail.cancel_reason} />
          <DataRow label="Previsão entrega" value={formatDate(detail.estimated_delivery)} />
        </dl>
      </section>

      {detail.status !== 'cancelled' ? (
        <section className="admin-panel rounded p-4 md:p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            Custo de envio (real)
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Valor pago ao transportador para calcular a margem do kit. Pode
            cadastrar antes do envio ou corrigir depois.
          </p>
          <div className="mt-4">
            <CycleShippingCostForm
              cycleId={detail.id}
              shippingCostCents={detail.shippingCostCents}
              onSuccess={() => {
                onUpdated?.();
                onReload?.(detail.id);
              }}
            />
          </div>
        </section>
      ) : null}

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
          onReload?.(detail.id);
        }}
      />
    </div>
  );
}
