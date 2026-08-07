'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import AsaasPaymentForm, {
  type AsaasCardPayload,
} from '@/components/checkout/AsaasPaymentForm';
import PagarmePaymentForm, {
  type PagarmeTokenResult,
} from '@/components/checkout/PagarmePaymentForm';
import {
  COMBO_MAX_INSTALLMENTS,
  comboInstallmentLabel,
} from '@/lib/checkout/combo-billing';
import { formatMoney } from '@/lib/dashboard/format';
import type { ComboTierUpgradeOptionPricing } from '@/lib/subscriptions/combo-tier-upgrade';
import type { PaymentProvider } from '@/lib/payments/provider';

interface Props {
  subscriptionId: string;
  currentPlanName: string;
  comboLabel: string;
  options: ComboTierUpgradeOptionPricing[];
  paymentProvider: Extract<PaymentProvider, 'asaas' | 'pagarme'>;
}

export default function SubscriptionComboTierUpgrade({
  subscriptionId,
  currentPlanName,
  comboLabel,
  options,
  paymentProvider,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedSlug, setSelectedSlug] = useState<
    ComboTierUpgradeOptionPricing['slug'] | null
  >(null);
  const [installmentCount, setInstallmentCount] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selected = useMemo(
    () => options.find((option) => option.slug === selectedSlug) ?? null,
    [options, selectedSlug]
  );

  if (options.length === 0) return null;

  async function submitUpgrade(payload: Record<string, unknown>) {
    if (!selected) return;

    const response = await fetch('/api/subscriptions/combo-tier-upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionId,
        targetPlanSlug: selected.slug,
        installmentCount,
        ...payload,
      }),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? 'Não foi possível concluir o upgrade.');
    }

    setMessage(
      `Upgrade concluído. Seu combo passou para ${selected.name} e a diferença foi cobrada.`
    );
    setSelectedSlug(null);
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleAsaasPay(card: AsaasCardPayload) {
    await submitUpgrade({ creditCard: card });
  }

  async function handlePagarmePay(tokenized: PagarmeTokenResult) {
    await submitUpgrade({
      cardToken: tokenized.token,
      cardLast4: tokenized.last4,
      cardBrand: tokenized.brand,
    });
  }

  return (
    <div className="space-y-4 border-t border-white/[0.06] pt-6">
      <div>
        <p className="font-display text-sm uppercase tracking-wide text-white">
          Upgrade de plano no combo
        </p>
        <p className="mt-1 text-sm text-stone-500">
          Você está no {comboLabel} {currentPlanName}. Faça upgrade para um plano
          superior mantendo a mesma duração — cobramos só a diferença dos meses
          que ainda faltam. Os próximos kits passam a ser do plano escolhido.
        </p>
      </div>

      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = selectedSlug === option.slug;
          const installmentCents = Math.round(
            option.differenceCents / installmentCount
          );

          return (
            <div
              key={option.slug}
              className={`rounded-sm border p-4 transition ${
                isSelected
                  ? 'border-gold/40 bg-gold/[0.06]'
                  : 'border-white/[0.06] bg-stone-950/40'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{option.name}</p>
                  <p className="mt-1 text-sm text-stone-400">
                    Diferença:{' '}
                    <span className="text-white">
                      {formatMoney(option.differenceCents)}
                    </span>
                    <span className="text-stone-600">
                      {' '}
                      · {option.remainingMonths} de {option.totalPrepaidMonths}{' '}
                      meses restantes
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setSelectedSlug(isSelected ? null : option.slug);
                    setInstallmentCount(1);
                    setError('');
                    setMessage('');
                  }}
                  className="cursor-pointer rounded-sm border border-gold/40 bg-gold/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-gold transition hover:bg-gold/20 disabled:opacity-50"
                >
                  {isSelected ? 'Fechar' : 'Fazer upgrade'}
                </button>
              </div>

              {isSelected ? (
                <div className="mt-4 space-y-4 border-t border-white/[0.06] pt-4">
                  <div className="rounded-sm border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100/90">
                    Ao confirmar, o plano sobe imediatamente para {option.name}.
                    Cobramos {formatMoney(option.differenceCents)} referente aos{' '}
                    {option.remainingMonths} meses restantes do combo.
                  </div>

                  <div>
                    <label
                      htmlFor={`combo-tier-installments-${option.slug}`}
                      className="mb-1.5 block text-xs text-stone-500"
                    >
                      Parcelas
                    </label>
                    <select
                      id={`combo-tier-installments-${option.slug}`}
                      value={installmentCount}
                      onChange={(event) =>
                        setInstallmentCount(Number(event.target.value))
                      }
                      disabled={pending}
                      className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white focus:border-ember/50 focus:outline-none"
                    >
                      {Array.from(
                        { length: COMBO_MAX_INSTALLMENTS },
                        (_, index) => index + 1
                      ).map((count) => (
                        <option key={count} value={count}>
                          {comboInstallmentLabel(count, option.interestFreeMax)}{' '}
                          ·{' '}
                          {formatMoney(
                            Math.round(option.differenceCents / count)
                          )}
                          /parcela
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-stone-600">
                      {formatMoney(installmentCents)}/parcela
                    </p>
                  </div>

                  {paymentProvider === 'asaas' ? (
                    <AsaasPaymentForm
                      disabled={pending}
                      submitLabel={`Pagar diferença · ${formatMoney(option.differenceCents)}`}
                      onSubmit={handleAsaasPay}
                      onError={setError}
                    />
                  ) : (
                    <PagarmePaymentForm
                      disabled={pending}
                      submitLabel={`Pagar diferença · ${formatMoney(option.differenceCents)}`}
                      onSubmit={handlePagarmePay}
                      onError={setError}
                    />
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-stone-400" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
