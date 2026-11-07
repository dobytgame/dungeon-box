import Link from 'next/link';
import { checkoutHref } from '@/lib/checkout/plans';
import CycleKitThemeSwap from '@/components/dashboard/CycleKitThemeSwap';
import CycleExtrasList from '@/components/dashboard/CycleExtrasList';
import ComboSubscriptionCallout from '@/components/dashboard/ComboSubscriptionCallout';
import CycleProgress from '@/components/dashboard/CycleProgress';
import DashboardCard from '@/components/dashboard/DashboardCard';
import DataRow from '@/components/dashboard/DataRow';
import EmptyState from '@/components/dashboard/EmptyState';
import StatusBadge from '@/components/dashboard/StatusBadge';
import SubscriptionPaymentCallout from '@/components/dashboard/SubscriptionPaymentCallout';
import SubscriptionUpgradeActivation from '@/components/dashboard/SubscriptionUpgradeActivation';
import ThemeVoteBanner from '@/components/dashboard/ThemeVoteBanner';
import ThemeVoteResult from '@/components/dashboard/ThemeVoteResult';
import { formatDashboardTracking, pickCurrentDashboardCycle } from '@/lib/dashboard/cycle-status';
import {
  formatDate,
  formatMoney,
  relOne,
} from '@/lib/dashboard/format';
import { getCustomerSubscriptionPaymentLink } from '@/lib/dashboard/pending-payment';
import { resolvePendingUpgradePricing } from '@/lib/subscriptions/upgrade';
import {
  LOYALTY_CYCLE_COUPON,
  LOYALTY_CYCLE_DISCOUNT,
  hasSentCycle,
} from '@/lib/dashboard/loyalty-milestones';
import {
  getCycles,
  getSubscriptionWithCycles,
  getManageableSubscriptions,
  getProfile,
  requireDashboardUser,
} from '@/lib/dashboard/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadDashboardCycleExtras } from '@/lib/dashboard/cycle-extras';
import {
  getLatestEndedThemePollWithTallies,
  getOpenThemePoll,
  getUserVote,
  userHasActiveSubscription,
} from '@/lib/theme-votes/queries';
import { userCanCastThemeVote, userCanSeeThemeVote } from '@/lib/theme-votes/access';
import { THEME_VOTE_MAX_CHANGES } from '@/lib/theme-votes/types';
import { getThemePollStatus } from '@/lib/theme-votes/window';
import {
  buildCycleKitThemeState,
  loadChangeableCycleKitThemeState,
  loadCycleKitThemeCatalog,
} from '@/lib/subscriptions/cycle-kit-theme';
import { formatStoreKitThemeLabel } from '@/lib/store/kit-themes';

export default async function DashboardPage() {
  const { user } = await requireDashboardUser();
  const profile = await getProfile(user.id);
  const manageable = await getManageableSubscriptions(user.id);
  const subscription = await getSubscriptionWithCycles(user.id);
  const plan = relOne(subscription?.plans);
  const cycles = subscription?.subscription_cycles;
  const cycleThreeSent = hasSentCycle(await getCycles(user.id), 3);
  const nextCycle = Array.isArray(cycles)
    ? pickCurrentDashboardCycle(cycles)
    : null;

  const isAdmin = profile?.is_admin === true;
  const showThemeVote = userCanSeeThemeVote(isAdmin);
  const admin = createAdminClient();
  const [nextCycleExtras, kitCatalog, changeableKit] = await Promise.all([
    nextCycle && Array.isArray(cycles)
      ? loadDashboardCycleExtras(admin, cycles).then(
          (map) => map.get(nextCycle.id) ?? []
        )
      : Promise.resolve([]),
    loadCycleKitThemeCatalog(admin),
    subscription
      ? loadChangeableCycleKitThemeState(admin, subscription.id)
      : Promise.resolve({ themes: [], state: null }),
  ]);
  const nextCycleTheme = nextCycle
    ? buildCycleKitThemeState({
        cycleId: nextCycle.id,
        cycleNumber: nextCycle.cycle_number,
        status: nextCycle.status,
        themes: kitCatalog,
        kitThemeId: nextCycle.kit_theme_id,
        changedFromId: nextCycle.kit_theme_changed_from_id,
      })
    : null;
  const swapState =
    changeableKit.state?.cycleId && nextCycle?.id === changeableKit.state.cycleId
      ? changeableKit.state
      : changeableKit.state?.canChange
        ? changeableKit.state
        : nextCycleTheme;
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
  const featuredVote = featuredPollId
    ? await getUserVote(admin, user.id, featuredPollId)
    : null;
  const featuredVoteId = featuredVote?.optionId ?? null;
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
          canChangeVote:
            Boolean(featuredVoteId) &&
            (featuredVote?.changeCount ?? 0) < THEME_VOTE_MAX_CHANGES,
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
  const pastDuePendingPlan = pastDueSubscription
    ? relOne(pastDueSubscription.pending_plan)
    : null;
  const pastDueUpgradePricing =
    pastDueSubscription && pastDuePendingPlan
      ? await resolvePendingUpgradePricing(pastDueSubscription)
      : null;
  const pastDuePaymentLink =
    pastDueSubscription && !pastDuePendingPlan
      ? await getCustomerSubscriptionPaymentLink(user.id, pastDueSubscription.id)
      : null;
  const pastDuePlan = pastDueSubscription
    ? relOne(pastDueSubscription.plans)
    : null;

  return (
    <div className="space-y-8 md:space-y-10">
      {pastDueSubscription && pastDuePendingPlan && pastDueUpgradePricing ? (
        <SubscriptionUpgradeActivation
          subscriptionId={pastDueSubscription.id}
          currentPlanName={pastDuePlan?.name ?? 'plano atual'}
          targetPlanName={pastDuePendingPlan.name}
          amountCents={pastDueUpgradePricing.totalCents}
          promoSummary={pastDueUpgradePricing.promoSummary}
          cardBrand={pastDueSubscription.card_brand}
          cardLast4={pastDueSubscription.card_last4}
        />
      ) : pastDueSubscription && pastDuePaymentLink ? (
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
          <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
          <DashboardCard title="Assinatura" accent="ember" fillHeight>
            <dl className="flex-1">
              <DataRow
                label="Plano"
                value={
                  <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                    <span className="text-mesa-parchment">{plan?.name ?? '—'}</span>
                    {plan ? (
                      <span className="text-mesa-ash">({formatMoney(plan.price_cents)}/mês)</span>
                    ) : null}
                  </span>
                }
              />
              <DataRow
                label="Status"
                value={<StatusBadge kind="subscription" status={subscription.status} />}
              />
              <DataRow label="Ciclo atual" value={subscription.current_cycle ?? 0} />
              <DataRow
                label="Próxima cobrança"
                value={formatDate(subscription.next_billing_date)}
                nowrap
              />
            </dl>
            <Link
              href="/dashboard/subscription"
              className="mt-auto inline-flex min-h-11 cursor-pointer items-center pt-4 text-sm text-mesa-ember transition-colors duration-200 hover:underline"
            >
              Ver detalhes →
            </Link>
          </DashboardCard>

          <DashboardCard
            title="Próxima entrega"
            accent="jade"
            fillHeight
            description={
              nextCycle
                ? nextCycleTheme
                  ? `Ciclo #${nextCycle.cycle_number} · ${formatStoreKitThemeLabel(nextCycleTheme.current)}`
                  : `Ciclo #${nextCycle.cycle_number}`
                : undefined
            }
            action={
              nextCycle ? (
                <StatusBadge kind="cycle" status={nextCycle.status} />
              ) : undefined
            }
          >
            {nextCycle ? (
              <div className="flex flex-1 flex-col space-y-4">
                <CycleProgress status={nextCycle.status} showCopy />
                <dl className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3">
                  <DataRow
                    label="Rastreio"
                    value={formatDashboardTracking(
                      nextCycle.status,
                      nextCycle.tracking_code,
                      nextCycle.carrier
                    )}
                    mono={Boolean(nextCycle.tracking_code)}
                  />
                  <DataRow
                    label="Previsão"
                    value={formatDate(nextCycle.estimated_delivery)}
                    nowrap
                  />
                  {nextCycle.bonus_notes ? (
                    <DataRow label="Brinde" value={nextCycle.bonus_notes} />
                  ) : null}
                </dl>
                {swapState && changeableKit.themes.length > 0 ? (
                  <div className="border-t border-white/10 pt-4">
                    <CycleKitThemeSwap
                      subscriptionId={subscription.id}
                      cycleId={swapState.cycleId}
                      cycleNumber={swapState.cycleNumber}
                      currentTheme={swapState.current}
                      themes={changeableKit.themes}
                      canChange={swapState.canChange}
                      lockedReason={swapState.lockedReason}
                      compact
                    />
                  </div>
                ) : null}
                {nextCycleExtras.length > 0 ? (
                  <CycleExtrasList items={nextCycleExtras} />
                ) : null}
              </div>
            ) : (
              <p className="flex-1 text-sm text-mesa-ash">
                Nenhum ciclo em andamento. Quando a assinatura for ativada, as entregas
                aparecem aqui.
              </p>
            )}
            <Link
              href="/dashboard/deliveries"
              className="mt-auto inline-flex min-h-11 cursor-pointer items-center pt-4 text-sm text-mesa-jade transition-colors duration-200 hover:underline"
            >
              Histórico de entregas →
            </Link>
          </DashboardCard>

          <DashboardCard title="Fidelidade" accent="ember" fillHeight>
            <ul className="flex-1 space-y-2">
              <li className="rounded-xl border border-mesa-jade/25 bg-mesa-jade/[0.06] px-4 py-3">
                <p className="home-v2-display text-[10px] tracking-[0.16em] text-mesa-jade">
                  Ciclo 3
                </p>
                <p className="mt-1 text-sm font-medium text-mesa-parchment">
                  {cycleThreeSent
                    ? `${LOYALTY_CYCLE_DISCOUNT}% na loja`
                    : 'Libera quando o kit 3 for enviado'}
                </p>
                {cycleThreeSent ? (
                  <p className="mt-1 font-mono text-xs tracking-wider text-mesa-ember">
                    {LOYALTY_CYCLE_COUPON}
                  </p>
                ) : null}
              </li>
              {([6, 9, 12] as const).map((n) => (
                <li
                  key={n}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5"
                >
                  <span className="text-sm text-mesa-ash">Ciclo {n}</span>
                  <span className="home-v2-display text-[10px] tracking-[0.14em] text-mesa-ash/80">
                    Em breve
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/dashboard/loyalty"
              className="mt-auto inline-flex min-h-11 cursor-pointer items-center pt-4 text-sm text-mesa-ember transition-colors duration-200 hover:underline"
            >
              Ver fidelidade →
            </Link>
          </DashboardCard>
        </div>
        </div>
      ) : null}

      <DashboardCard title="Atalhos da mesa" accent="none">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { href: '/dashboard/subscription', label: 'Assinatura', desc: 'Plano, cores e cobrança' },
            { href: '/dashboard/deliveries', label: 'Entregas', desc: 'Produção, rastreio e histórico' },
            { href: '/dashboard/pedidos', label: 'Pedidos da loja', desc: 'Kits extras e envio' },
            { href: '/dashboard/aventura', label: 'Mostre sua aventura', desc: 'Novidade em breve' },
            { href: '/dashboard/profile', label: 'Perfil', desc: 'CPF, telefone e dados' },
            { href: '/dashboard/addresses', label: 'Endereços', desc: 'Onde a caixa chega' },
            ...(showThemeVote
              ? [{ href: '/dashboard/votacao', label: 'Votação', desc: 'Tema da próxima caixa' }]
              : []),
            { href: '/dashboard/payments', label: 'Pagamentos', desc: 'Histórico e cartão' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-[72px] cursor-pointer flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-[border-color,background-color] duration-200 hover:border-white/25 hover:bg-white/[0.07]"
            >
              <p className="text-sm font-medium text-mesa-parchment">{item.label}</p>
              <p className="mt-1 text-sm text-mesa-ash">{item.desc}</p>
            </Link>
          ))}
        </div>
      </DashboardCard>

      {profile ? (
        <DashboardCard title="Resumo do perfil" accent="jade">
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
