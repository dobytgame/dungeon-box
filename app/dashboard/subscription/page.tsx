import Link from 'next/link';
import ComboSubscriptionCallout from '@/components/dashboard/ComboSubscriptionCallout';
import DashboardCard from '@/components/dashboard/DashboardCard';
import DataRow from '@/components/dashboard/DataRow';
import EmptyState from '@/components/dashboard/EmptyState';
import StatusBadge from '@/components/dashboard/StatusBadge';
import SubscriptionActions from '@/components/dashboard/SubscriptionActions';
import SubscriptionPaymentCallout from '@/components/dashboard/SubscriptionPaymentCallout';
import SubscriptionComboUpgrade from '@/components/dashboard/SubscriptionComboUpgrade';
import SubscriptionGatewayMigration from '@/components/dashboard/SubscriptionGatewayMigration';
import SubscriptionUpgrade from '@/components/dashboard/SubscriptionUpgrade';
import { checkoutHref, type PlanSlug } from '@/lib/checkout/plans';
import { parseCustomerNotes } from '@/lib/checkout/special-notes';
import type { CustomerSubscriptionPaymentLink } from '@/lib/dashboard/pending-payment';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatZip,
  relOne,
} from '@/lib/dashboard/format';
import { getManageableSubscriptions, requireDashboardUser } from '@/lib/dashboard/queries';
import type { Subscription } from '@/lib/dashboard/types';
import {
  buildComboUpgradeOptions,
  canUpgradeSubscriptionToCombo,
} from '@/lib/subscriptions/combo-upgrade';
import {
  buildUpgradeOptionsPricing,
  resolveCurrentSubscriptionRecurringPricing,
  resolvePendingUpgradePricing,
} from '@/lib/subscriptions/upgrade';
import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { PAGARME_CONFIGURED } from '@/lib/pagarme/client';
import { isAsaasSubscriptionNeedingPagarmeMigration } from '@/lib/pagarme/complete-asaas-migration';

function resolveComboUpgradeProvider(
  subscription: Subscription
): 'asaas' | 'pagarme' | null {
  if (subscription.pagarme_subscription_id && PAGARME_CONFIGURED) {
    return 'pagarme';
  }
  if (subscription.asaas_subscription_id && ASAAS_CONFIGURED) {
    return 'asaas';
  }
  return null;
}

async function SubscriptionDetailCard({
  subscription,
  showDevMeta,
  paymentLink,
}: {
  subscription: Subscription;
  showDevMeta: boolean;
  paymentLink?: CustomerSubscriptionPaymentLink | null;
}) {
  const comboUpgradeProvider = resolveComboUpgradeProvider(subscription);
  const [upgradeOptions, pendingUpgradePricing, currentRecurringPricing, comboUpgradeOptions] =
    await Promise.all([
      buildUpgradeOptionsPricing(subscription),
      resolvePendingUpgradePricing(subscription),
      resolveCurrentSubscriptionRecurringPricing(subscription),
      comboUpgradeProvider && canUpgradeSubscriptionToCombo(subscription)
        ? buildComboUpgradeOptions(subscription)
        : Promise.resolve([]),
    ]);
  const plan = relOne(subscription.plans);
  const address = relOne(subscription.addresses);
  const customerNotes = parseCustomerNotes(subscription.special_notes);
  const isPending = subscription.status === 'pending';
  const isPastDue = subscription.status === 'past_due';
  const needsPayment = isPending || isPastDue;
  const resumeCheckoutHref = plan?.slug
    ? checkoutHref(plan.slug as PlanSlug)
    : checkoutHref('heroi');

  return (
    <div className="space-y-8">
      {PAGARME_CONFIGURED &&
      isAsaasSubscriptionNeedingPagarmeMigration(subscription) ? (
        <SubscriptionGatewayMigration
          subscriptionId={subscription.id}
          planName={plan?.name ?? 'Assinatura'}
          nextBillingDate={subscription.next_billing_date}
        />
      ) : null}

      {needsPayment && paymentLink ? (
        <SubscriptionPaymentCallout
          status={isPastDue ? 'past_due' : 'pending'}
          planName={plan?.name ?? null}
          paymentUrl={paymentLink.url}
          paymentSource={paymentLink.source}
          amountCents={paymentLink.amountCents}
          dueDate={paymentLink.dueDate}
          resumeCheckoutHref={isPending ? resumeCheckoutHref : undefined}
        />
      ) : isPending ? (
        <div
          className="rounded-sm border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100/90"
          role="status"
        >
          <p>
            O pagamento deste plano não foi concluído. Você pode tentar novamente no
            checkout ou cancelar a tentativa em &quot;Gerenciar assinatura&quot;.
          </p>
          <Link
            href={resumeCheckoutHref}
            className="mt-3 inline-flex font-display text-xs uppercase tracking-widest text-ember hover:text-ember-bright"
          >
            Continuar checkout
          </Link>
        </div>
      ) : null}

      <ComboSubscriptionCallout subscription={subscription} />

      <DashboardCard
        title={plan?.name ?? 'Assinatura'}
        accent="ember"
        action={<StatusBadge kind="subscription" status={subscription.status} />}
      >
        <dl>
          <DataRow
            label="Plano"
            value={
              plan ? (
                <span className="text-white">
                  {plan.name}{' '}
                  <span className="text-stone-500">
                    ·{' '}
                    {currentRecurringPricing &&
                    currentRecurringPricing.totalCents <
                      currentRecurringPricing.originalTotalCents ? (
                      <>
                        <span className="line-through">
                          {formatMoney(currentRecurringPricing.originalTotalCents)}
                        </span>{' '}
                        {formatMoney(currentRecurringPricing.totalCents)}
                      </>
                    ) : (
                      formatMoney(
                        currentRecurringPricing?.totalCents ?? plan.price_cents
                      )
                    )}
                    /mês
                    {currentRecurringPricing?.promoSummary
                      ? ` (${currentRecurringPricing.promoSummary.toLowerCase()})`
                      : ''}
                  </span>
                </span>
              ) : (
                '—'
              )
            }
          />
          {subscription.promo_code ? (
            <DataRow label="Cupom" value={subscription.promo_code} />
          ) : null}
          {customerNotes ? (
            <DataRow label="Observações" value={customerNotes} />
          ) : null}
          {(subscription.shipping_cents ?? 0) > 0 ? (
            <DataRow
              label="Frete mensal"
              value={formatMoney(subscription.shipping_cents ?? 0)}
            />
          ) : null}
          <DataRow label="Ciclo atual" value={subscription.current_cycle ?? 0} />
          <DataRow
            label="Próxima cobrança"
            value={formatDate(subscription.next_billing_date)}
          />
          <DataRow label="Membro desde" value={formatDate(subscription.started_at)} />
        </dl>
      </DashboardCard>

      {plan ? (
        <DashboardCard title="Benefícios incluídos" accent="frost">
          <dl>
            <DataRow label="Peças por mês" value={`${plan.pieces_min}–${plan.pieces_max}`} />
            <DataRow
              label="Frete"
              value={
                plan.freight_free
                  ? `Grátis em ${plan.freight_regions?.join(', ') ?? 'regiões elegíveis'}`
                  : 'Calculado por CEP no checkout'
              }
            />
            {plan.store_discount > 0 ? (
              <DataRow label="Desconto na loja" value={`${plan.store_discount}%`} />
            ) : null}
            {plan.has_vip_group ? (
              <DataRow label="Grupo VIP" value="Incluso" />
            ) : null}
            {plan.has_vote ? (
              <DataRow label="Voto no tema" value="Incluso" />
            ) : null}
          </dl>
        </DashboardCard>
      ) : null}

      <DashboardCard title="Endereço de entrega" accent="none">
        {address ? (
          <dl>
            <DataRow label="Destinatário" value={address.recipient} />
            <DataRow
              label="Endereço"
              value={`${address.street}, ${address.number}${address.complement ? ` — ${address.complement}` : ''}`}
            />
            <DataRow
              label="Cidade"
              value={`${address.neighborhood}, ${address.city}/${address.state}`}
            />
            <DataRow label="CEP" value={formatZip(address.zip_code)} />
          </dl>
        ) : (
          <p className="text-sm text-stone-500">
            Nenhum endereço vinculado.{' '}
            <Link href="/dashboard/addresses" className="text-ember hover:underline">
              Cadastrar endereço
            </Link>
          </p>
        )}
      </DashboardCard>

      <DashboardCard title="Gerenciar assinatura" accent="none">
        {!isPending && !isPastDue ? (
          <div className="mb-6 space-y-6">
            <SubscriptionUpgrade
              subscription={subscription}
              upgradeOptions={upgradeOptions}
              pendingUpgradeTotalCents={
                pendingUpgradePricing?.totalCents ?? null
              }
              pendingUpgradePromoSummary={
                pendingUpgradePricing?.promoSummary ?? null
              }
            />
            {comboUpgradeProvider && comboUpgradeOptions.length > 0 ? (
              <SubscriptionComboUpgrade
                subscriptionId={subscription.id}
                currentCycle={subscription.current_cycle ?? 1}
                comboOptions={comboUpgradeOptions}
                paymentProvider={comboUpgradeProvider}
              />
            ) : null}
          </div>
        ) : null}
        <SubscriptionActions subscription={subscription} />
      </DashboardCard>

      {showDevMeta ? (
        <details className="rounded-sm border border-white/[0.04] bg-stone-950/30 p-4 text-xs text-stone-600">
          <summary className="cursor-pointer font-display uppercase tracking-widest text-stone-500">
            Detalhes técnicos
          </summary>
          <dl className="mt-4 space-y-1 font-mono">
            <div>id: {subscription.id}</div>
            <div>mp_subscription_id: {subscription.mp_subscription_id ?? '—'}</div>
            <div>updated: {formatDateTime(subscription.updated_at)}</div>
          </dl>
        </details>
      ) : null}
    </div>
  );
}

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams?: { referral?: string; terms?: string };
}) {
  const { user } = await requireDashboardUser();
  const subscriptions = await getManageableSubscriptions(user.id);
  const isDev = process.env.NODE_ENV === 'development';
  const referralBlocked = searchParams?.referral === 'inactive';
  const termsBlocked = searchParams?.terms === 'inactive';
  const hasActiveSubscription = subscriptions.some(
    (subscription) => subscription.status === 'active'
  );

  const payableIds = subscriptions
    .filter((sub) => sub.status === 'pending' || sub.status === 'past_due')
    .map((sub) => sub.id);
  const { getCustomerPaymentLinks } = await import('@/lib/dashboard/pending-payment');
  const paymentLinks = await getCustomerPaymentLinks(user.id, payableIds);
  const paymentLinkBySubscription = new Map(
    paymentLinks.map((link) => [link.subscriptionId, link])
  );

  if (subscriptions.length === 0) {
    return (
      <div className="space-y-8">
        {referralBlocked ? (
          <p
            className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90"
            role="status"
          >
            O programa Indique e Ganhe está disponível apenas para assinantes com
            assinatura ativa.
          </p>
        ) : null}
        {termsBlocked ? (
          <p
            className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90"
            role="status"
          >
            Os Termos e Condições de Compra estão disponíveis apenas para assinantes
            com assinatura ativa.
          </p>
        ) : null}
        <EmptyState
          title="Nenhuma assinatura ativa"
          description="Escolha um plano e complete o checkout para começar a receber suas dungeons todo mês. Você pode assinar mais de um plano ao mesmo tempo."
          ctaLabel="Escolher plano"
          ctaHref={checkoutHref('heroi')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-10 md:space-y-12">
      {referralBlocked ? (
        <p
          className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90"
          role="status"
        >
          O programa Indique e Ganhe está disponível apenas para assinantes com
          assinatura ativa.
        </p>
      ) : null}
      {termsBlocked ? (
        <p
          className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90"
          role="status"
        >
          Os Termos e Condições de Compra estão disponíveis apenas para assinantes
          com assinatura ativa.
        </p>
      ) : null}
      {subscriptions.length > 1 ? (
        <p className="text-sm text-stone-400">
          Você tem {subscriptions.length} assinaturas ativas. Cada plano é cobrado e
          enviado separadamente.
        </p>
      ) : null}

      {subscriptions.map((subscription, index) => (
        <section key={subscription.id} className="space-y-8 md:space-y-10">
          {subscriptions.length > 1 ? (
            <h2 className="font-display text-sm uppercase tracking-[0.25em] text-stone-500">
              Assinatura {index + 1}
            </h2>
          ) : null}
          <SubscriptionDetailCard
            subscription={subscription}
            showDevMeta={isDev && index === 0}
            paymentLink={paymentLinkBySubscription.get(subscription.id) ?? null}
          />
        </section>
      ))}

      {hasActiveSubscription ? (
        <DashboardCard title="Termos e Condições de Compra" accent="none">
          <p className="text-sm text-stone-400">
            Consulte o contrato completo da sua assinatura e produtos avulsos, com
            prazos de produção, garantia, frete e políticas de cancelamento.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link
              href="/dashboard/subscription/termos"
              className="inline-flex min-h-[44px] items-center font-display text-xs uppercase tracking-widest text-ember hover:text-ember-bright"
            >
              Ver termos →
            </Link>
          </div>
        </DashboardCard>
      ) : null}

      <DashboardCard title="Assinar outro plano" accent="none">
        <p className="text-sm text-stone-400">
          Quer receber outro tier de caixa? Escolha um plano que ainda não esteja na sua
          conta.
        </p>
        <Link
          href={checkoutHref('heroi')}
          className="mt-4 inline-flex min-h-[44px] items-center font-display text-xs uppercase tracking-widest text-ember hover:text-ember-bright"
        >
          Ver planos →
        </Link>
      </DashboardCard>
    </div>
  );
}
