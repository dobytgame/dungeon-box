import Link from 'next/link';
import { checkoutHref } from '@/lib/checkout/plans';
import CycleExtrasList from '@/components/dashboard/CycleExtrasList';
import ComboSubscriptionCallout from '@/components/dashboard/ComboSubscriptionCallout';
import CycleProgress from '@/components/dashboard/CycleProgress';
import DashboardCard from '@/components/dashboard/DashboardCard';
import DataRow from '@/components/dashboard/DataRow';
import EmptyState from '@/components/dashboard/EmptyState';
import StatusBadge from '@/components/dashboard/StatusBadge';
import SubscriptionPaymentCallout from '@/components/dashboard/SubscriptionPaymentCallout';
import ThemeVoteBanner from '@/components/dashboard/ThemeVoteBanner';
import ThemeVoteResult from '@/components/dashboard/ThemeVoteResult';
import { formatDashboardTracking, pickCurrentDashboardCycle } from '@/lib/dashboard/cycle-status';
import {
  formatDate,
  formatMoney,
  relOne,
} from '@/lib/dashboard/format';
import { getCustomerSubscriptionPaymentLink } from '@/lib/dashboard/pending-payment';
import {
  getSubscriptionWithCycles,
  getManageableSubscriptions,
  getLoyaltyLevel,
  getProfile,
  requireDashboardUser,
} from '@/lib/dashboard/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadDashboardCycleExtras } from '@/lib/dashboard/cycle-extras';
import {
  getLatestEndedThemePollWithTallies,
  getOpenThemePoll,
  getUserVoteOptionId,
  userHasActiveSubscription,
} from '@/lib/theme-votes/queries';
import { userCanCastThemeVote, userCanSeeThemeVote } from '@/lib/theme-votes/access';
import { getThemePollStatus } from '@/lib/theme-votes/window';

export default async function DashboardPage() {
  const { user } = await requireDashboardUser();
  const profile = await getProfile(user.id);
  const manageable = await getManageableSubscriptions(user.id);
  const subscription = await getSubscriptionWithCycles(user.id);
  const plan = relOne(subscription?.plans);
  const loyalty = subscription?.loyalty_level
    ? await getLoyaltyLevel(subscription.loyalty_level)
    : await getLoyaltyLevel(1);

  const cycles = subscription?.subscription_cycles;
  const nextCycle = Array.isArray(cycles)
    ? pickCurrentDashboardCycle(cycles)
    : null;

  const isAdmin = profile?.is_admin === true;
  const showThemeVote = userCanSeeThemeVote(isAdmin);
  const admin = createAdminClient();
  const nextCycleExtras =
    nextCycle && Array.isArray(cycles)
      ? (await loadDashboardCycleExtras(admin, cycles)).get(nextCycle.id) ?? []
      : [];
  const isActiveSubscriber = showThemeVote
    ? await userHasActiveSubscription(admin, user.id)
    : false;
  const canVote = userCanCastThemeVote(isAdmin, isActiveSubscriber);
  const openPoll = showThemeVote ? await getOpenThemePoll(admin) : null;
  const endedPoll =
    showThemeVote && !openPoll
      ? await getLatestEndedThemePollWithTallies(admin)
      : null;
  const featuredPollId = openPoll?.id ?? endedPoll?.id ?? null;
  const featuredVoteId = featuredPollId
    ? await getUserVoteOptionId(admin, user.id, featuredPollId)
    : null;
  const voteBanner =
    openPoll &&
    openPoll.options.length >= 2 &&
    getThemePollStatus(openPoll.starts_at, openPoll.ends_at) === 'open' &&
    (canVote || featuredVoteId)
      ? {
          cycleNumber: openPoll.cycle_number,
          endsAt: openPoll.ends_at,
          options: openPoll.options,
          votedOptionId: featuredVoteId,
        }
      : null;
  const voteResult =
    !voteBanner &&
    endedPoll &&
    endedPoll.status === 'ended' &&
    endedPoll.options.length >= 2
      ? {
          cycle_number: endedPoll.cycle_number,
          ends_at: endedPoll.ends_at,
          totalVotes: endedPoll.totalVotes,
          isTie: endedPoll.isTie,
          winnerOptionId: endedPoll.winnerOptionId,
          options: endedPoll.options,
          userVoteOptionId: featuredVoteId,
        }
      : null;

  const pastDueSubscription = manageable.find((sub) => sub.status === 'past_due');
  const pastDuePaymentLink = pastDueSubscription
    ? await getCustomerSubscriptionPaymentLink(user.id, pastDueSubscription.id)
    : null;
  const pastDuePlan = pastDueSubscription
    ? relOne(pastDueSubscription.plans)
    : null;

  return (
    <div className="space-y-8 md:space-y-10">
      {pastDueSubscription && pastDuePaymentLink ? (
        <SubscriptionPaymentCallout
          status="past_due"
          planName={pastDuePlan?.name ?? null}
          paymentUrl={pastDuePaymentLink.url}
          paymentSource={pastDuePaymentLink.source}
          amountCents={pastDuePaymentLink.amountCents}
          dueDate={pastDuePaymentLink.dueDate}
        />
      ) : null}
      {voteBanner ? <ThemeVoteBanner poll={voteBanner} /> : null}
      {voteResult ? <ThemeVoteResult poll={voteResult} variant="home" /> : null}
      {manageable.length === 0 ? (
        <EmptyState
          title="Sem assinatura ativa"
          description="Assine um plano para receber cenários 3D todo mês na sua porta."
          ctaLabel="Assinar agora"
          ctaHref={checkoutHref('heroi')}
        />
      ) : subscription ? (
        <div className="space-y-6">
          <ComboSubscriptionCallout subscription={subscription} />
          <div className="grid gap-6 lg:grid-cols-3">
          <DashboardCard title="Assinatura" accent="ember">
            <dl>
              <DataRow
                label="Plano"
                value={
                  <span className="text-white">
                    {plan?.name ?? '—'}{' '}
                    {plan ? (
                      <span className="text-stone-500">
                        ({formatMoney(plan.price_cents)}/mês)
                      </span>
                    ) : null}
                  </span>
                }
              />
              <DataRow
                label="Status"
                value={<StatusBadge kind="subscription" status={subscription.status} />}
              />
              <DataRow
                label="Ciclo atual"
                value={subscription.current_cycle ?? 0}
              />
              <DataRow
                label="Próxima cobrança"
                value={formatDate(subscription.next_billing_date)}
              />
            </dl>
            <Link
              href="/dashboard/subscription"
              className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center text-sm text-ember hover:underline"
            >
              Ver detalhes →
            </Link>
          </DashboardCard>

          <DashboardCard title="Próxima entrega" accent="frost">
            {nextCycle ? (
              <div className="space-y-5">
                <dl>
                  <DataRow label="Ciclo" value={`#${nextCycle.cycle_number}`} />
                  <DataRow
                    label="Status"
                    value={<StatusBadge kind="cycle" status={nextCycle.status} />}
                  />
                  <DataRow
                    label="Rastreio"
                    value={formatDashboardTracking(
                      nextCycle.status,
                      nextCycle.tracking_code,
                      nextCycle.carrier
                    )}
                  />
                  <DataRow
                    label="Previsão"
                    value={formatDate(nextCycle.estimated_delivery)}
                  />
                </dl>
                <CycleProgress status={nextCycle.status} showCopy />
                {nextCycleExtras.length > 0 ? (
                  <CycleExtrasList items={nextCycleExtras} />
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-stone-500">
                Nenhum ciclo em andamento. Quando a assinatura for ativada, as entregas
                aparecem aqui.
              </p>
            )}
            <Link
              href="/dashboard/deliveries"
              className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center text-sm text-frost hover:underline"
            >
              Histórico de entregas →
            </Link>
          </DashboardCard>

          <DashboardCard title="Fidelidade" accent="gold">
            <dl>
              <DataRow
                label="Nível"
                value={
                  <span>
                    {loyalty?.icon} {loyalty?.name ?? 'Recruta'}
                  </span>
                }
              />
              <DataRow label="Ciclos pagos" value={subscription.current_cycle ?? 0} />
              <DataRow
                label="Bônus"
                value={
                  loyalty?.bonus_pieces
                    ? `+${loyalty.bonus_pieces} peça(s) por ciclo`
                    : 'Nenhum ainda'
                }
              />
            </dl>
            <Link
              href="/dashboard/loyalty"
              className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center text-sm text-gold hover:underline"
            >
              Ver progressão →
            </Link>
          </DashboardCard>
        </div>
        </div>
      ) : null}

      <DashboardCard title="Explorar" accent="none">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: '/dashboard/profile', label: 'Editar perfil', desc: 'CPF, telefone e dados' },
            { href: '/dashboard/addresses', label: 'Endereços', desc: 'Entrega e padrão' },
            { href: '/dashboard/payments', label: 'Pagamentos', desc: 'Histórico e troca de cartão' },
            { href: '/dashboard/pedidos', label: 'Pedidos', desc: 'Loja, kits extras e envio' },
            { href: '/dashboard/loyalty', label: 'Fidelidade', desc: 'Níveis e votos' },
            ...(showThemeVote
              ? [{ href: '/dashboard/votacao', label: 'Votação', desc: 'Resultado ou próximo tema' }]
              : []),
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-[72px] cursor-pointer flex-col justify-center rounded-sm border border-white/10 p-4 transition-colors duration-200 hover:border-ember/30 hover:bg-white/5"
            >
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="mt-1 text-xs text-stone-500">{item.desc}</p>
            </Link>
          ))}
        </div>
      </DashboardCard>

      {profile ? (
        <DashboardCard title="Resumo do perfil" accent="frost">
          <dl>
            <DataRow label="E-mail" value={profile.email} />
            <DataRow
              label="Newsletter"
              value={profile.newsletter ? 'Inscrito' : 'Não inscrito'}
            />
          </dl>
        </DashboardCard>
      ) : null}
    </div>
  );
}
