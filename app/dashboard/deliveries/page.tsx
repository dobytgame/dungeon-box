import CycleExtrasList from '@/components/dashboard/CycleExtrasList';
import DashboardCard from '@/components/dashboard/DashboardCard';
import CycleProgress from '@/components/dashboard/CycleProgress';
import EmptyState from '@/components/dashboard/EmptyState';
import StatusBadge from '@/components/dashboard/StatusBadge';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  relOne,
} from '@/lib/dashboard/format';
import {
  dashboardCycleStatusCopy,
  formatDashboardTracking,
} from '@/lib/dashboard/cycle-status';
import { getCycles, requireDashboardUser } from '@/lib/dashboard/queries';
import { loadDashboardCycleExtras } from '@/lib/dashboard/cycle-extras';
import { createAdminClient } from '@/lib/supabase/admin';
import { PRODUCTION_PIPELINE } from '@/lib/subscriptions/cycle-production';

export default async function DeliveriesPage() {
  const { user } = await requireDashboardUser();
  const cycles = await getCycles(user.id);
  const extrasByCycle =
    cycles.length > 0
      ? await loadDashboardCycleExtras(createAdminClient(), cycles)
      : new Map();

  return (
    <div className="space-y-8 md:space-y-10">
      {cycles.length === 0 ? (
        <EmptyState
          title="Nenhuma entrega ainda"
          description="Após o primeiro pagamento aprovado, os ciclos aparecem aqui com produção, embalagem, coleta da Loggi e rastreio."
          ctaLabel="Ver assinatura"
          ctaHref="/dashboard/subscription"
        />
      ) : (
        <div className="space-y-4">
          {cycles.map((cycle) => {
            const theme = relOne(cycle.themes);
            const copy = dashboardCycleStatusCopy(cycle.status);
            const showProgress = PRODUCTION_PIPELINE.includes(cycle.status);

            return (
              <DashboardCard
                key={cycle.id}
                title={`Ciclo #${cycle.cycle_number}${theme ? ` — ${theme.emoji ?? ''} ${theme.name}` : ''}`}
                action={<StatusBadge kind="cycle" status={cycle.status} />}
              >
                {showProgress ? (
                  <div className="mb-6">
                    <p className="home-v2-display mb-3 text-[11px] tracking-[0.18em] text-mesa-jade">
                      Andamento
                    </p>
                    <CycleProgress status={cycle.status} showCopy />
                  </div>
                ) : (
                  <p className="mb-6 text-sm leading-relaxed text-mesa-ash">
                    {copy.summary}
                  </p>
                )}

                <dl className="grid gap-0 md:grid-cols-2 md:gap-x-8">
                  <div>
                    <div className="home-v2-display border-b border-white/5 py-2 text-[11px] tracking-[0.16em] text-mesa-jade">
                      Tema
                    </div>
                    <div className="py-2 text-sm text-mesa-parchment">
                      {theme
                        ? `${theme.name} (${theme.month_number}/${theme.year})`
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="home-v2-display border-b border-white/5 py-2 text-[11px] tracking-[0.16em] text-mesa-jade">
                      Rastreio
                    </div>
                    <div className="py-2 text-sm text-mesa-parchment">
                      {formatDashboardTracking(
                        cycle.status,
                        cycle.tracking_code,
                        cycle.carrier
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="home-v2-display border-b border-white/5 py-2 text-[11px] tracking-[0.16em] text-mesa-jade">
                      Valor
                    </div>
                    <div className="py-2 text-sm text-mesa-parchment">
                      {cycle.amount_cents ? formatMoney(cycle.amount_cents) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="home-v2-display border-b border-white/5 py-2 text-[11px] tracking-[0.16em] text-mesa-jade">
                      Enviado
                    </div>
                    <div className="py-2 text-sm text-mesa-parchment">
                      {formatDateTime(cycle.shipped_at)}
                    </div>
                  </div>
                  <div>
                    <div className="home-v2-display border-b border-white/5 py-2 text-[11px] tracking-[0.16em] text-mesa-jade">
                      Entregue
                    </div>
                    <div className="py-2 text-sm text-mesa-parchment">
                      {formatDateTime(cycle.delivered_at)}
                    </div>
                  </div>
                  <div>
                    <div className="home-v2-display border-b border-white/5 py-2 text-[11px] tracking-[0.16em] text-mesa-jade">
                      Previsão
                    </div>
                    <div className="py-2 text-sm text-mesa-parchment">
                      {formatDate(cycle.estimated_delivery)}
                    </div>
                  </div>
                  <div>
                    <div className="home-v2-display border-b border-white/5 py-2 text-[11px] tracking-[0.16em] text-mesa-jade">
                      Bônus fidelidade
                    </div>
                    <div className="py-2 text-sm text-mesa-parchment">
                      {cycle.bonus_pieces
                        ? `+${cycle.bonus_pieces} peça(s)`
                        : '—'}
                      {cycle.bonus_notes ? ` · ${cycle.bonus_notes}` : ''}
                    </div>
                  </div>
                  <div>
                    <div className="home-v2-display border-b border-white/5 py-2 text-[11px] tracking-[0.16em] text-mesa-jade">
                      Pago em
                    </div>
                    <div className="py-2 text-sm text-mesa-parchment">
                      {formatDateTime(cycle.paid_at)}
                    </div>
                  </div>
                </dl>
                {(extrasByCycle.get(cycle.id) ?? []).length > 0 ? (
                  <div className="mt-6">
                    <CycleExtrasList
                      items={extrasByCycle.get(cycle.id) ?? []}
                    />
                  </div>
                ) : null}
              </DashboardCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
