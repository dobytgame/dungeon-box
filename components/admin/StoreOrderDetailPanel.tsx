'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CycleProductionPanel from '@/components/admin/CycleProductionPanel';
import CycleShipForm from '@/components/admin/CycleShipForm';
import ProductionPipeline from '@/components/admin/ProductionPipeline';
import StoreOrderItemsSection from '@/components/admin/StoreOrderItemsSection';
import DataRow from '@/components/dashboard/DataRow';
import StatusBadge from '@/components/dashboard/StatusBadge';
import type { AdminStoreOrderDetail } from '@/lib/admin/store-orders';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatPhone,
} from '@/lib/dashboard/format';
import { cycleStatusLabel } from '@/lib/subscriptions/cycle-production';

interface Props {
  order: AdminStoreOrderDetail;
  onUpdated?: () => void;
}

export default function StoreOrderDetailPanel({ order, onUpdated }: Props) {
  const router = useRouter();

  function refresh() {
    onUpdated?.();
    router.refresh();
  }

  if (order.kind === 'standalone') {
    const { detail, cardId } = order;

    return (
      <div className="space-y-8">
        <ProductionPipeline status={detail.status} />

        <section className="admin-panel rounded p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                Pedido avulso
              </p>
              <h2 className="mt-1 font-mono text-lg font-medium text-zinc-100">
                {detail.storeOrderPurchases
                  .flatMap((purchase) => purchase.items.map((item) => item.name))
                  .join(', ') || 'Loja avulsa'}
              </h2>
            </div>
            <StatusBadge kind="cycle" status={detail.status} />
          </div>

          <dl className="mt-6">
            <DataRow
              label="Cliente"
              value={
                detail.userId ? (
                  <Link
                    href={`/admin/clientes/${detail.userId}`}
                    className="text-console hover:underline"
                  >
                    {detail.customerName ?? detail.customerEmail ?? '—'}
                  </Link>
                ) : (
                  '—'
                )
              }
            />
            <DataRow label="E-mail" value={detail.customerEmail ?? '—'} />
            <DataRow
              label="Telefone"
              value={formatPhone(detail.customerPhone) || '—'}
            />
            <DataRow
              label="Valor"
              value={formatMoney(detail.amount_cents ?? 0)}
            />
            <DataRow
              label="Pago em"
              value={detail.paid_at ? formatDateTime(detail.paid_at) : '—'}
            />
            <DataRow
              label="Endereço"
              value={detail.orderAddress?.formattedMultiline ?? '—'}
            />
            {detail.tracking_code ? (
              <DataRow label="Rastreio" value={detail.tracking_code} />
            ) : null}
          </dl>
        </section>

        {detail.storeOrderPurchases.length > 0 ? (
          <section className="admin-panel rounded p-5 md:p-6">
            <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
              Itens do pedido
            </h3>
            <div className="mt-4">
              <StoreOrderItemsSection
                purchases={detail.storeOrderPurchases}
                showOrderId={detail.storeOrderPurchases.length > 1}
              />
            </div>
          </section>
        ) : null}

        <CycleProductionPanel
          cycleId={cardId}
          status={detail.status}
          defaultCarrier={detail.carrier ?? 'Correios'}
          productionNotes={detail.production_notes}
          shipMode={detail.status === 'preparing' ? 'inline' : 'modal'}
          onUpdated={refresh}
        />

        {detail.status === 'preparing' ? (
          <section className="admin-panel rounded p-5 md:p-6">
            <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
              Registrar envio
            </h3>
            <div className="mt-4">
              <CycleShipForm
                cycleId={cardId}
                defaultCarrier={detail.carrier ?? 'Correios'}
                defaultShippingCostCents={detail.shippingCostCents}
                onSuccess={refresh}
              />
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {order.cycleStatus ? (
        <ProductionPipeline status={order.cycleStatus} />
      ) : null}

      <section className="admin-panel rounded p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              Pedido com assinatura
            </p>
            <h2 className="mt-1 font-mono text-lg font-medium text-zinc-100">
              {order.itemsSummary}
            </h2>
          </div>
          {order.paymentStatus === 'approved' && order.cycleStatus ? (
            <StatusBadge kind="cycle" status={order.cycleStatus} />
          ) : (
            <StatusBadge kind="payment" status={order.paymentStatus} />
          )}
        </div>

        <p className="mt-4 text-sm text-zinc-400">
          Este pedido será produzido e enviado junto com o ciclo da assinatura.
          Use a fila de produção do ciclo para avançar status, rastreio e envio.
        </p>

        <dl className="mt-6">
          <DataRow
            label="Cliente"
            value={
              <Link
                href={`/admin/clientes/${order.userId}`}
                className="text-console hover:underline"
              >
                {order.customerName ?? order.customerEmail ?? '—'}
              </Link>
            }
          />
          <DataRow label="E-mail" value={order.customerEmail ?? '—'} />
          <DataRow
            label="Telefone"
            value={formatPhone(order.customerPhone) || '—'}
          />
          <DataRow label="Valor" value={formatMoney(order.amountCents)} />
          <DataRow
            label="Pago em"
            value={order.paidAt ? formatDateTime(order.paidAt) : '—'}
          />
          <DataRow label="Endereço" value={order.addressLine ?? '—'} />
          {order.cycleStatus ? (
            <DataRow
              label="Status do ciclo"
              value={cycleStatusLabel(order.cycleStatus)}
            />
          ) : null}
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          {order.cycleId ? (
            <Link
              href={`/admin/ciclos/${order.cycleId}`}
              className="inline-flex min-h-[40px] items-center rounded border border-console/30 px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-console hover:bg-console/10"
            >
              Abrir ciclo #{order.cycleNumber ?? '—'}
            </Link>
          ) : null}
          {order.subscriptionId ? (
            <Link
              href={`/admin/assinaturas/${order.subscriptionId}`}
              className="inline-flex min-h-[40px] items-center rounded border border-zinc-700 px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-300 hover:border-zinc-600"
            >
              Ver assinatura
            </Link>
          ) : null}
        </div>
      </section>

      <section className="admin-panel rounded p-5 md:p-6">
        <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
          Itens do pedido
        </h3>
        <div className="mt-4">
          <StoreOrderItemsSection
            purchases={[order.purchaseView]}
          />
        </div>
        <p className="mt-4 text-xs text-zinc-600">
          Pedido em {order.createdAt ? formatDate(order.createdAt) : '—'}
        </p>
      </section>
    </div>
  );
}
