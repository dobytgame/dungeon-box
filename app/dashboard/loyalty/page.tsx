import { Lock, LockOpen } from 'lucide-react';
import LoyaltyCouponCopy from '@/components/dashboard/LoyaltyCouponCopy';
import { getCycles, requireDashboardUser } from '@/lib/dashboard/queries';
import {
  LOYALTY_CYCLE_COUPON,
  LOYALTY_CYCLE_DISCOUNT,
  LOYALTY_MILESTONE_CYCLES,
  hasSentCycle,
} from '@/lib/dashboard/loyalty-milestones';

export default async function LoyaltyPage() {
  const { user } = await requireDashboardUser();
  const cycles = await getCycles(user.id);
  const cycleThreeSent = hasSentCycle(cycles, 3);

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {LOYALTY_MILESTONE_CYCLES.map((cycle) => {
        const isCycleThree = cycle === 3;
        const unlocked = isCycleThree && cycleThreeSent;

        return (
          <article
            key={cycle}
            className={`relative overflow-hidden rounded-2xl border transition-colors duration-200 ${
              unlocked
                ? 'border-mesa-ember/60 bg-mesa-stone shadow-[0_30px_80px_-30px_rgba(255,100,45,0.45)]'
                : 'border-white/[0.06] bg-mesa-stone/60'
            }`}
          >
            {unlocked ? (
              <div
                className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-mesa-ember/15 blur-2xl"
                aria-hidden="true"
              />
            ) : null}
            <div
              className={`p-5 md:p-6 ${
                unlocked
                  ? 'border-l-4 border-l-mesa-ember'
                  : 'border-l-4 border-l-white/10'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border ${
                    unlocked
                      ? 'border-mesa-ember/40 bg-mesa-ember/10 text-mesa-ember'
                      : 'border-white/10 bg-white/[0.03] text-mesa-ash'
                  }`}
                  aria-hidden="true"
                >
                  {unlocked ? (
                    <LockOpen className="h-5 w-5" strokeWidth={1.5} />
                  ) : (
                    <Lock className="h-5 w-5" strokeWidth={1.5} />
                  )}
                </div>
                <div>
                  <p className="home-v2-display text-xl text-mesa-parchment">
                    Ciclo {cycle}
                  </p>
                  <p
                    className={`home-v2-display mt-1 text-[11px] tracking-[0.18em] ${
                      unlocked ? 'text-mesa-ember' : 'text-mesa-ash'
                    }`}
                  >
                    {unlocked ? 'Liberado' : 'Em breve'}
                  </p>
                </div>
              </div>

              {unlocked ? (
                <>
                  <p className="mt-5 text-sm leading-relaxed text-mesa-parchment">
                    {LOYALTY_CYCLE_DISCOUNT}% de desconto na loja
                  </p>
                  <LoyaltyCouponCopy code={LOYALTY_CYCLE_COUPON} />
                </>
              ) : (
                <p className="mt-5 text-sm leading-relaxed text-mesa-ash">
                  {isCycleThree
                    ? 'O desconto abre quando a caixa do ciclo 3 for enviada.'
                    : 'Este marco ainda está fechado.'}
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
