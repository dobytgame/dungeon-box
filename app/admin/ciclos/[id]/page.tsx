import Link from 'next/link';
import { notFound } from 'next/navigation';
import CycleProductionPanel from '@/components/admin/CycleProductionPanel';
import ProductionPipeline from '@/components/admin/ProductionPipeline';
import DataRow from '@/components/dashboard/DataRow';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminCycleDetail } from '@/lib/admin/queries';
import { DEFAULT_SHIPPING_CARRIER } from '@/lib/shipping/carrier';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  relOne,
} from '@/lib/dashboard/format';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminCycleDetailPage({ params }: Props) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const cycle = await getAdminCycleDetail(admin, id);

  if (!cycle) notFound();

  const subscription = relOne(cycle.subscriptions);
  const plan = subscription ? relOne(subscription.plans) : null;
  const address = subscription ? relOne(subscription.addresses) : null;
  const profile = subscription
    ? relOne(
        (subscription as { profiles?: unknown }).profiles as
          | {
              full_name?: string | null;
              display_name?: string | null;
              email?: string;
              phone?: string | null;
            }
          | {
              full_name?: string | null;
              display_name?: string | null;
              email?: string;
              phone?: string | null;
            }[]
          | null
          | undefined
      )
    : null;
  const theme = relOne(cycle.themes);

  return (
    <div className="space-y-8">
      <Link
        href="/admin/ciclos"
        className="inline-block font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500 hover:text-console"
      >
        ← Voltar para produção
      </Link>

      <ProductionPipeline status={cycle.status} />

      <section className="admin-panel rounded p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-mono text-lg font-medium text-zinc-100">
              Pedido · ciclo #{cycle.cycle_number}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">{theme?.name ?? 'Tema a definir'}</p>
          </div>
          <StatusBadge kind="cycle" status={cycle.status} />
        </div>

        <dl className="mt-6">
          <DataRow
            label="Cliente"
            value={
              profile?.email && subscription ? (
                <Link
                  href={`/admin/clientes/${subscription.user_id}`}
                  className="text-console hover:underline"
                >
                  {profile.full_name ?? profile.display_name ?? profile.email}
                </Link>
              ) : (
                '—'
              )
            }
          />
          <DataRow
            label="Assinatura"
            value={
              subscription ? (
                <Link
                  href={`/admin/assinaturas/${subscription.id}`}
                  className="text-console hover:underline"
                >
                  {plan?.name ?? subscription.id}
                </Link>
              ) : (
                '—'
              )
            }
          />
          <DataRow label="Valor do ciclo" value={formatMoney(cycle.amount_cents ?? 0)} />
          <DataRow label="Pago em" value={formatDate(cycle.paid_at)} />
          <DataRow label="Transportadora" value={cycle.carrier} />
          <DataRow label="Rastreio" value={cycle.tracking_code} mono />
          <DataRow label="Enviado em" value={formatDateTime(cycle.shipped_at)} />
          <DataRow label="Entregue em" value={formatDateTime(cycle.delivered_at)} />
          <DataRow label="Cancelado em" value={formatDateTime(cycle.cancelled_at)} />
          <DataRow label="Motivo cancelamento" value={cycle.cancel_reason} />
          <DataRow label="Notas de produção" value={cycle.production_notes} />
          <DataRow label="Previsão entrega" value={formatDate(cycle.estimated_delivery)} />
          {address ? (
            <DataRow
              label="Endereço"
              value={`${address.street}, ${address.number}${address.complement ? ` — ${address.complement}` : ''} · ${address.city}/${address.state} · ${address.zip_code}`}
            />
          ) : null}
        </dl>
      </section>

      <CycleProductionPanel
        cycleId={cycle.id}
        status={cycle.status}
        defaultCarrier={cycle.carrier ?? DEFAULT_SHIPPING_CARRIER}
        cancelReason={cycle.cancel_reason}
        productionNotes={cycle.production_notes}
        feedbackRequestSentAt={cycle.feedback_request_sent_at ?? null}
      />
    </div>
  );
}
