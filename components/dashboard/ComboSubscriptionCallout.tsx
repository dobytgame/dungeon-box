import { Sparkles } from 'lucide-react';
import { COMBO_BILLING_ENABLED } from '@/lib/checkout/combo-billing';
import { getSubscriptionComboSummary } from '@/lib/checkout/combo-display';
import { formatDate, formatMoney } from '@/lib/dashboard/format';
import type { Subscription } from '@/lib/dashboard/types';

export default function ComboSubscriptionCallout({
  subscription,
}: {
  subscription: Subscription;
}) {
  if (!COMBO_BILLING_ENABLED) return null;

  const combo = getSubscriptionComboSummary(subscription);
  if (!combo) return null;

  return (
    <div
      className="rounded-sm border border-gold/25 bg-gold/[0.06] px-4 py-3 text-sm text-stone-200"
      role="status"
    >
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
        <div>
          <p className="font-display text-xs uppercase tracking-[0.2em] text-gold">
            {combo.label}
          </p>
          {combo.isPrepaidActive && combo.prepaidUntil ? (
            <p className="mt-1 text-stone-100">
              Combo ativo até{' '}
              <strong className="font-medium text-white">
                {formatDate(combo.prepaidUntil, {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </strong>
              {combo.prepaidMonths ? (
                <span className="text-stone-400">
                  {' '}
                  · {combo.prepaidMonths} meses cobertos
                </span>
              ) : null}
            </p>
          ) : (
            <p className="mt-1 text-stone-300">{combo.nextBillingLabel}</p>
          )}
          {combo.comboTotalCents ? (
            <p className="mt-1 text-xs text-stone-500">
              Valor do combo: {formatMoney(combo.comboTotalCents)}
              {combo.installmentLabel ? ` · ${combo.installmentLabel}` : null}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
