import Link from 'next/link';
import DashboardCard from '@/components/dashboard/DashboardCard';
import DataRow from '@/components/dashboard/DataRow';
import EmptyState from '@/components/dashboard/EmptyState';
import StatusBadge from '@/components/dashboard/StatusBadge';
import SubscriptionActions from '@/components/dashboard/SubscriptionActions';
import { checkoutHref } from '@/lib/checkout/plans';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatZip,
  relOne,
} from '@/lib/dashboard/format';
import { getAllSubscriptions, requireDashboardUser } from '@/lib/dashboard/queries';

export default async function SubscriptionPage() {
  const { user } = await requireDashboardUser();
  const subscriptions = await getAllSubscriptions(user.id);
  const subscription = subscriptions[0] ?? null;
  const plan = relOne(subscription?.plans);
  const address = relOne(subscription?.addresses);
  const isDev = process.env.NODE_ENV === 'development';

  if (!subscription) {
    return (
      <EmptyState
        title="Nenhuma assinatura ativa"
        description="Escolha um plano e complete o checkout para começar a receber suas dungeons todo mês."
        ctaLabel="Escolher plano"
        ctaHref={checkoutHref('heroi')}
      />
    );
  }

  return (
    <div className="space-y-8 md:space-y-10">
      <DashboardCard
        title={plan?.name ?? 'Sua assinatura'}
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
          {subscription.special_notes ? (
            <DataRow label="Observações" value={subscription.special_notes} />
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
              label="Frete grátis"
              value={
                plan.freight_free
                  ? plan.freight_regions?.join(', ') ?? 'Sim'
                  : 'Conforme região'
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
        <SubscriptionActions subscription={subscription} />
      </DashboardCard>

      {isDev && subscriptions.length > 1 ? (
        <DashboardCard title="Histórico (dev)" accent="none">
          <ul className="space-y-2 text-sm text-stone-400">
            {subscriptions.map((sub) => {
              const p = relOne(sub.plans);
              return (
                <li key={sub.id} className="flex flex-wrap items-center gap-2">
                  <StatusBadge kind="subscription" status={sub.status} />
                  <span>{p?.name ?? '—'}</span>
                  <span className="text-stone-600">· {formatDate(sub.created_at)}</span>
                </li>
              );
            })}
          </ul>
        </DashboardCard>
      ) : null}

      {isDev ? (
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
