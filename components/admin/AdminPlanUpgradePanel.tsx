'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  adminCancelPlanUpgradeAction,
  adminSchedulePlanUpgradeAction,
} from '@/lib/admin/actions';
import { formatMoney } from '@/lib/dashboard/format';
import type { PlanSlug } from '@/lib/checkout/plans';
import type { UpgradeOptionPricing } from '@/lib/subscriptions/upgrade';

interface Props {
  subscriptionId: string;
  pastDue: boolean;
  currentPlanName: string;
  pendingPlan: { name: string; priceCents: number } | null;
  options: UpgradeOptionPricing[];
}

export default function AdminPlanUpgradePanel({
  subscriptionId,
  pastDue,
  currentPlanName,
  pendingPlan,
  options,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function schedule(slug: PlanSlug, planName: string) {
    const confirmMessage = pastDue
      ? `Liberar upgrade de ${currentPlanName} para ${planName}? O cliente precisa pagar na conta para ativar o plano novo.`
      : `Agendar upgrade de ${currentPlanName} para ${planName}? O plano novo vale a partir da próxima cobrança.`;

    if (!window.confirm(confirmMessage)) return;

    setMessage('');
    setError('');
    startTransition(async () => {
      const result = await adminSchedulePlanUpgradeAction(subscriptionId, slug);
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      setMessage(
        pastDue
          ? `Upgrade para ${planName} liberado. O cliente precisa pagar na conta para ativar.`
          : `Upgrade para ${planName} agendado.`
      );
      router.refresh();
    });
  }

  function cancelUpgrade() {
    if (
      !window.confirm(
        'Cancelar o upgrade agendado? A próxima cobrança volta ao plano atual.'
      )
    ) {
      return;
    }

    setMessage('');
    setError('');
    startTransition(async () => {
      const result = await adminCancelPlanUpgradeAction(subscriptionId);
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      setMessage('Upgrade cancelado.');
      router.refresh();
    });
  }

  return (
    <section className="rounded-sm border border-white/[0.06] p-5 md:p-6">
      <h3 className="font-display text-sm uppercase tracking-widest text-stone-400">
        Upgrade de plano
      </h3>
      <p className="mt-2 text-sm text-stone-500">
        {pastDue
          ? 'O plano novo só ativa quando o cliente pagar. Ele vê o valor e o botão de pagamento na conta.'
          : 'O plano superior passa a valer na próxima cobrança. Até lá, o cliente continua no plano atual.'}
      </p>

      {pendingPlan ? (
        <div className="mt-4 space-y-3 rounded-sm border border-amber-400/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-100">
            {pastDue
              ? 'Aguardando o cliente pagar para ativar '
              : 'Upgrade agendado para '}
            <span className="font-medium text-white">{pendingPlan.name}</span> (
            {formatMoney(pendingPlan.priceCents)}/mês).
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={cancelUpgrade}
            className="cursor-pointer rounded-sm border border-white/15 px-4 py-2 font-display text-xs uppercase tracking-widest text-stone-300 transition hover:border-white/30 disabled:opacity-50"
          >
            Cancelar upgrade
          </button>
        </div>
      ) : options.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">
          Este cliente já está no plano mais alto.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {options.map((option) => (
            <div
              key={option.slug}
              className="flex flex-col gap-3 rounded-sm border border-white/[0.06] bg-stone-950/40 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-white">{option.name}</p>
                <p className="text-sm text-stone-500">
                  {formatMoney(option.totalCents)}/mês
                  {pastDue ? ' para o cliente pagar e ativar' : ' na próxima cobrança'}
                  {option.promoSummary
                    ? ` (${option.promoSummary.toLowerCase()})`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => schedule(option.slug, option.name)}
                className="cursor-pointer rounded-sm border border-console/40 bg-console/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-console transition hover:bg-console/20 disabled:opacity-50"
              >
                {pastDue ? 'Liberar pagamento' : 'Agendar upgrade'}
              </button>
            </div>
          ))}
        </div>
      )}

      {message ? (
        <p className="mt-4 text-sm text-emerald-200" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
