import Link from 'next/link';
import DashboardCard from '@/components/dashboard/DashboardCard';
import DataRow from '@/components/dashboard/DataRow';
import EmptyState from '@/components/dashboard/EmptyState';
import StatusBadge from '@/components/dashboard/StatusBadge';
import SubscriptionActions from '@/components/dashboard/SubscriptionActions';
import SubscriptionUpgrade from '@/components/dashboard/SubscriptionUpgrade';
import { checkoutHref, type PlanSlug } from '@/lib/checkout/plans';
import { parseCustomerNotes } from '@/lib/checkout/special-notes';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatZip,
  relOne,
} from '@/lib/dashboard/format';
import { getManageableSubscriptions, requireDashboardUser } from '@/lib/dashboard/queries';
import type { Subscription } from '@/lib/dashboard/types';

function SubscriptionDetailCard({
  subscription,
  showDevMeta,
}: {
  subscription: Subscription;
  showDevMeta: boolean;
}) {
  const plan = relOne(subscription.plans);
  const address = relOne(subscription.addresses);
  const customerNotes = parseCustomerNotes(subscription.special_notes);
  const isPending = subscription.status === 'pending';
  const resumeCheckoutHref = plan?.slug
    ? checkoutHref(plan.slug as PlanSlug)
    : checkoutHref('heroi');

  return (
    <div className="space-y-8">
      {isPending ? (
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
                    · {formatMoney(plan.price_cents)}/mês
                  </span>
                </span>
              ) : (
                '—'
              )
            }
          />
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
        {!isPending ? (
          <div className="mb-6">
            <SubscriptionUpgrade subscription={subscription} />
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
  searchParams?: { referral?: string };
}) {
  const { user } = await requireDashboardUser();
  const subscriptions = await getManageableSubscriptions(user.id);
  const isDev = process.env.NODE_ENV === 'development';
  const referralBlocked = searchParams?.referral === 'inactive';

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
          />
        </section>
      ))}

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
