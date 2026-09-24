import { Sparkles } from 'lucide-react';
import { COMBO_BILLING_ENABLED } from '@/lib/checkout/combo-billing';
import { getSubscriptionComboSummary } from '@/lib/checkout/combo-display';
import { formatDate, formatMoney } from '@/lib/dashboard/format';
import { relOne } from '@/lib/dashboard/format';
import type { Subscription } from '@/lib/dashboard/types';

export default function ComboSubscriptionCallout({
  subscription,
}: {
  subscription: Subscription;
}) {
  if (!COMBO_BILLING_ENABLED) return null;

  const plan = relOne(subscription.plans);
  const combo = getSubscriptionComboSummary(subscription, plan?.slug ?? null);
  if (!combo) return null;

  return (
    <div
      className="rounded-2xl border border-mesa-jade/25 bg-mesa-jade/[0.06] px-4 py-3 text-sm text-mesa-parchment"
      role="status"
    >
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-mesa-jade" aria-hidden="true" />
        <div>
          <p className="home-v2-display text-[11px] tracking-[0.2em] text-mesa-jade">
            {combo.label}
          </p>
          {combo.isPrepaidActive && combo.prepaidUntil ? (
            <p className="mt-1 text-mesa-parchment">
              Combo ativo até{' '}
              <strong className="font-medium text-mesa-parchment">
                {formatDate(combo.prepaidUntil, {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </strong>
              {combo.prepaidMonths ? (
                <span className="text-mesa-ash">
                  {' '}
                  · {combo.prepaidMonths} meses cobertos
                </span>
              ) : null}
            </p>
          ) : (
            <p className="mt-1 text-mesa-ash">{combo.nextBillingLabel}</p>
          )}
          {combo.comboTotalCents ? (
            <p className="mt-1 text-xs text-mesa-ash">
              Valor do combo: {formatMoney(combo.comboTotalCents)}
              {combo.installmentLabel ? ` · ${combo.installmentLabel}` : null}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
