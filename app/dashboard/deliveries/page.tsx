import DashboardCard from '@/components/dashboard/DashboardCard';
import EmptyState from '@/components/dashboard/EmptyState';
import StatusBadge from '@/components/dashboard/StatusBadge';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  relOne,
} from '@/lib/dashboard/format';
import { getCycles, requireDashboardUser } from '@/lib/dashboard/queries';

export default async function DeliveriesPage() {
  const { user } = await requireDashboardUser();
  const cycles = await getCycles(user.id);

  return (
    <div className="space-y-8 md:space-y-10">
      {cycles.length === 0 ? (
        <EmptyState
          title="Nenhuma entrega ainda"
          description="Após o primeiro pagamento aprovado, os ciclos mensais aparecem aqui com status de produção, envio e entrega."
          ctaLabel="Ver assinatura"
          ctaHref="/dashboard/subscription"
        />
      ) : (
        <div className="space-y-4">
          {cycles.map((cycle) => {
            const theme = relOne(cycle.themes);
            return (
              <DashboardCard
                key={cycle.id}
                title={`Ciclo #${cycle.cycle_number}${theme ? ` — ${theme.emoji ?? ''} ${theme.name}` : ''}`}
                action={<StatusBadge kind="cycle" status={cycle.status} />}
              >
                <dl className="grid gap-0 md:grid-cols-2 md:gap-x-8">
                  <div>
                    <div className="border-b border-white/5 py-2 text-xs text-stone-500">ID</div>
                    <div className="py-2 font-mono text-xs text-stone-400">{cycle.id}</div>
                  </div>
                  <div>
                    <div className="border-b border-white/5 py-2 text-xs text-stone-500">Tema</div>
                    <div className="py-2 text-sm text-stone-200">
                      {theme ? `${theme.name} (${theme.month_number}/${theme.year})` : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="border-b border-white/5 py-2 text-xs text-stone-500">Rastreio</div>
                    <div className="py-2 text-sm text-stone-200">
                      {cycle.tracking_code
                        ? `${cycle.carrier ?? 'Transportadora'}: ${cycle.tracking_code}`
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="border-b border-white/5 py-2 text-xs text-stone-500">Valor</div>
                    <div className="py-2 text-sm text-stone-200">
                      {cycle.amount_cents ? formatMoney(cycle.amount_cents) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="border-b border-white/5 py-2 text-xs text-stone-500">Enviado</div>
                    <div className="py-2 text-sm text-stone-200">
                      {formatDateTime(cycle.shipped_at)}
                    </div>
                  </div>
                  <div>
                    <div className="border-b border-white/5 py-2 text-xs text-stone-500">Entregue</div>
                    <div className="py-2 text-sm text-stone-200">
                      {formatDateTime(cycle.delivered_at)}
                    </div>
                  </div>
                  <div>
                    <div className="border-b border-white/5 py-2 text-xs text-stone-500">Previsão</div>
                    <div className="py-2 text-sm text-stone-200">
                      {formatDate(cycle.estimated_delivery)}
                    </div>
                  </div>
                  <div>
                    <div className="border-b border-white/5 py-2 text-xs text-stone-500">Bônus fidelidade</div>
                    <div className="py-2 text-sm text-stone-200">
                      {cycle.bonus_pieces ? `+${cycle.bonus_pieces} peça(s)` : '—'}
                      {cycle.bonus_notes ? ` · ${cycle.bonus_notes}` : ''}
                    </div>
                  </div>
                  <div>
                    <div className="border-b border-white/5 py-2 text-xs text-stone-500">Pago em</div>
                    <div className="py-2 text-sm text-stone-200">
                      {formatDateTime(cycle.paid_at)}
                    </div>
                  </div>
                </dl>
              </DashboardCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
