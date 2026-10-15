'use client';

import { useState, useTransition } from 'react';
import { Info } from 'lucide-react';
import { homeV2ButtonClassName } from '@/components/home-v2/HomeV2Button';
import {
  cancelComboSwitchToMonthlyAction,
  scheduleComboSwitchToMonthlyAction,
  setComboAutoRenewAction,
} from '@/app/dashboard/actions';
import { getSubscriptionComboSummary } from '@/lib/checkout/combo-display';
import { formatDate, formatMoney, relOne } from '@/lib/dashboard/format';
import type { Subscription } from '@/lib/dashboard/types';

export default function ComboRenewalPreferences({
  subscription,
}: {
  subscription: Subscription;
}) {
  const plan = relOne(subscription.plans);
  const combo = getSubscriptionComboSummary(subscription, plan?.slug ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!combo?.isCombo) return null;

  const prepaidLabel = combo.prepaidUntil
    ? formatDate(combo.prepaidUntil, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  function run(action: () => Promise<{ error?: string; success?: boolean }>) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage('Preferência atualizada.');
    });
  }

  return (
    <div
      className="rounded-2xl border border-white/10 bg-mesa-ink/40 px-4 py-4 text-sm text-mesa-parchment md:px-5"
      role="region"
      aria-labelledby="combo-renewal-heading"
    >
      <div className="flex items-start gap-2.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-mesa-jade" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3
              id="combo-renewal-heading"
              className="home-v2-display text-[11px] tracking-[0.2em] text-mesa-jade"
            >
              Renovação do combo
            </h3>
            <p className="mt-2 text-pretty leading-relaxed text-mesa-ash">
              {combo.autoRenewEnabled && !combo.switchingToMonthly ? (
                <>
                  Ao fim do pacote
                  {prepaidLabel ? (
                    <>
                      {' '}
                      (<strong className="font-medium text-mesa-parchment">{prepaidLabel}</strong>)
                    </>
                  ) : null}
                  , cobramos automaticamente o{' '}
                  <strong className="font-medium text-mesa-parchment">
                    mesmo {combo.label.toLowerCase()}
                  </strong>
                  {combo.comboTotalCents ? (
                    <>
                      {' '}
                      ({formatMoney(combo.comboTotalCents)})
                    </>
                  ) : null}
                  , com o desconto do combo mantido.
                </>
              ) : combo.switchingToMonthly ? (
                <>
                  Você agendou mudança para o{' '}
                  <strong className="font-medium text-mesa-parchment">plano mensal</strong>
                  {prepaidLabel ? <> a partir de {prepaidLabel}</> : null}. Os ciclos já
                  pagos do combo continuam normalmente; a partir daí o desconto do pacote não
                  se aplica mais.
                </>
              ) : (
                <>
                  A renovação automática está desligada. Você recebe os meses já pagos deste
                  pacote; depois disso não haverá nova cobrança de combo e a{' '}
                  <strong className="font-medium text-mesa-parchment">fidelidade zera</strong>{' '}
                  ao término do período contratado
                  {prepaidLabel ? <> ({prepaidLabel})</> : null}.
                </>
              )}
            </p>
          </div>

          <ul className="list-disc space-y-1.5 pl-5 text-xs text-mesa-ash">
            <li>
              Mudar para mensal mantém seus ciclos atuais, mas você perde o desconto do combo nas
              próximas cobranças.
            </li>
            <li>
              Desativar a renovação automática encerra novos pacotes; a fidelidade não continua
              após o fim deste combo.
            </li>
          </ul>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {combo.autoRenewEnabled && !combo.switchingToMonthly ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  className={homeV2ButtonClassName({ variant: 'secondary', size: 'sm' })}
                  onClick={() =>
                    run(() => setComboAutoRenewAction(subscription.id, false))
                  }
                >
                  Não renovar combo
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className={homeV2ButtonClassName({ variant: 'ghost', size: 'sm' })}
                  onClick={() =>
                    run(() => scheduleComboSwitchToMonthlyAction(subscription.id))
                  }
                >
                  Passar para mensal
                </button>
              </>
            ) : null}

            {!combo.autoRenewEnabled && !combo.switchingToMonthly ? (
              <button
                type="button"
                disabled={pending}
                className={homeV2ButtonClassName({ variant: 'secondary', size: 'sm' })}
                onClick={() =>
                  run(() => setComboAutoRenewAction(subscription.id, true))
                }
              >
                Reativar renovação automática
              </button>
            ) : null}

            {combo.switchingToMonthly ? (
              <button
                type="button"
                disabled={pending}
                className={homeV2ButtonClassName({ variant: 'secondary', size: 'sm' })}
                onClick={() =>
                  run(() => cancelComboSwitchToMonthlyAction(subscription.id))
                }
              >
                Manter combo automático
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="text-xs text-red-300" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="text-xs text-mesa-jade" role="status">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
