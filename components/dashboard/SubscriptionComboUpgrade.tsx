'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import AsaasPaymentForm, {
  type AsaasCardPayload,
} from '@/components/checkout/AsaasPaymentForm';
import ComboUpgradeCouponField, {
  type ComboUpgradeCouponApplyResult,
} from '@/components/dashboard/ComboUpgradeCouponField';
import { CHECKOUT_COUPONS_ENABLED } from '@/lib/checkout/public';
import {
  COMBO_MAX_INSTALLMENTS,
  comboInstallmentLabel,
} from '@/lib/checkout/combo-billing';
import { formatMoney } from '@/lib/dashboard/format';
import type { ComboUpgradeOptionPricing } from '@/lib/subscriptions/combo-upgrade';

interface Props {
  subscriptionId: string;
  currentCycle: number;
  comboOptions: ComboUpgradeOptionPricing[];
}

export default function SubscriptionComboUpgrade({
  subscriptionId,
  currentCycle,
  comboOptions: initialComboOptions,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [comboOptions, setComboOptions] = useState(initialComboOptions);
  const [selectedTerm, setSelectedTerm] = useState<
    ComboUpgradeOptionPricing['term'] | null
  >(null);
  const [installmentCount, setInstallmentCount] = useState(1);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponSummary, setCouponSummary] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [couponError, setCouponError] = useState('');

  const selected = useMemo(
    () => comboOptions.find((option) => option.term === selectedTerm) ?? null,
    [comboOptions, selectedTerm]
  );

  if (comboOptions.length === 0) return null;

  function handleCouponApply(result: ComboUpgradeCouponApplyResult) {
    setComboOptions(result.options);
    setCouponCode(result.code);
    setCouponSummary(result.summary);
    setCouponError('');
  }

  function handleCouponRemove() {
    setCouponCode(null);
    setCouponSummary(null);
    setComboOptions(initialComboOptions);
    setCouponError('');
  }

  async function handlePay(card: AsaasCardPayload) {
    if (!selected) return;

    const response = await fetch('/api/subscriptions/combo-upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionId,
        billingTerm: selected.term,
        installmentCount,
        couponCode,
        creditCard: card,
      }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(payload.error ?? 'Não foi possível concluir a migração.');
    }

    setMessage('Combo ativado com sucesso. Sua assinatura mensal foi substituída.');
    setSelectedTerm(null);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 border-t border-white/[0.06] pt-6">
      <div>
        <p className="font-display text-sm uppercase tracking-wide text-white">
          Migrar para combo
        </p>
        <p className="mt-1 text-sm text-stone-500">
          Ao confirmar, sua{' '}
          <strong className="font-medium text-stone-300">
            assinatura mensal será cancelada
          </strong>{' '}
          e o combo passa a ficar ativo imediatamente. Seu ciclo de fidelidade
          (ciclo {currentCycle}){' '}
          <strong className="font-medium text-stone-300">continua valendo</strong>{' '}
          — não zera. Os valores já incluem o desconto do combo; o cupom da
          assinatura mensal{' '}
          <strong className="font-medium text-stone-300">não</strong> é aplicado
          aqui.
          {CHECKOUT_COUPONS_ENABLED
            ? ' Se quiser, use um cupom extra só para esta migração.'
            : ''}
        </p>
      </div>

      {CHECKOUT_COUPONS_ENABLED ? (
        <ComboUpgradeCouponField
          subscriptionId={subscriptionId}
          couponCode={couponCode}
          couponSummary={couponSummary}
          onApply={handleCouponApply}
          onRemove={handleCouponRemove}
          onError={setCouponError}
          disabled={pending}
        />
      ) : null}

      <div className="space-y-3">
        {comboOptions.map((option) => {
          const isSelected = selectedTerm === option.term;
          const hasExtraCouponDiscount =
            option.originalTotalCents > option.totalCents;

          return (
            <div
              key={option.term}
              className={`rounded-sm border p-4 transition ${
                isSelected
                  ? 'border-gold/40 bg-gold/[0.06]'
                  : 'border-white/[0.06] bg-stone-950/40'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    {option.label}{' '}
                    <span className="text-gold">{option.badge}</span>
                  </p>
                  <p className="text-sm text-stone-500">{option.description}</p>
                  <p className="mt-1 text-sm text-stone-400">
                    {hasExtraCouponDiscount ? (
                      <>
                        <span className="text-stone-600 line-through">
                          {formatMoney(option.originalTotalCents)}
                        </span>{' '}
                        <span className="text-white">
                          {formatMoney(option.totalCents)}
                        </span>
                      </>
                    ) : (
                      formatMoney(option.totalCents)
                    )}{' '}
                    à vista
                    {option.savingsCents > 0 ? (
                      <span className="text-stone-600">
                        {' '}
                        · economia do combo {formatMoney(option.savingsCents)}
                      </span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setSelectedTerm(isSelected ? null : option.term);
                    setInstallmentCount(1);
                    setError('');
                    setMessage('');
                  }}
                  className="cursor-pointer rounded-sm border border-gold/40 bg-gold/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-gold transition hover:bg-gold/20 disabled:opacity-50"
                >
                  {isSelected ? 'Fechar' : 'Escolher combo'}
                </button>
              </div>

              {isSelected ? (
                <div className="mt-4 space-y-4 border-t border-white/[0.06] pt-4">
                  <div className="rounded-sm border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100/90">
                    A cobrança mensal atual será encerrada. O combo entra como
                    ativo e cobre os próximos meses de caixa a partir do próximo
                    ciclo.
                  </div>

                  <div>
                    <label
                      htmlFor={`combo-installments-${option.term}`}
                      className="mb-1.5 block text-xs text-stone-500"
                    >
                      Parcelas
                    </label>
                    <select
                      id={`combo-installments-${option.term}`}
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
                          {comboInstallmentLabel(count, option.interestFreeMax)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <AsaasPaymentForm
                    disabled={pending}
                    submitLabel={`Pagar combo · ${formatMoney(option.totalCents)}`}
                    onSubmit={handlePay}
                    onError={setError}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {couponError ? (
        <p className="text-sm text-red-400" role="alert">
          {couponError}
        </p>
      ) : null}
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
