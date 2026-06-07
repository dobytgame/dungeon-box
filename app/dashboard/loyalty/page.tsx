import { Crown, Shield, Sword, Swords, Target } from 'lucide-react';
import DashboardCard from '@/components/dashboard/DashboardCard';
import DataRow from '@/components/dashboard/DataRow';
import {
  getLatestSubscription,
  getLoyaltyLevels,
  requireDashboardUser,
} from '@/lib/dashboard/queries';

const levelIcons: Record<number, typeof Sword> = {
  1: Sword,
  2: Swords,
  3: Target,
  4: Shield,
  5: Crown,
};

export default async function LoyaltyPage() {
  const { user } = await requireDashboardUser();
  const subscription = await getLatestSubscription(user.id);
  const levels = await getLoyaltyLevels();
  const currentLevel = subscription?.loyalty_level ?? 1;
  const cycles = subscription?.current_cycle ?? 0;
  const nextLevel = levels.find((l) => l.level === currentLevel + 1);

  return (
    <div className="space-y-8 md:space-y-10">
      <DashboardCard title="Seu progresso" accent="gold">
        <dl>
          <DataRow label="Ciclos pagos" value={cycles} />
          <DataRow label="Nível atual" value={currentLevel} />
          <DataRow
            label="Próximo nível"
            value={
              nextLevel
                ? `${nextLevel.name} — ${nextLevel.min_cycles} ciclos`
                : 'Nível máximo alcançado'
            }
          />
        </dl>
      </DashboardCard>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {levels.map((level) => {
          const unlocked = cycles >= level.min_cycles;
          const isCurrent = level.level === currentLevel;
          const Icon = levelIcons[level.level] ?? Sword;

          return (
            <article
              key={level.id}
              className={`relative overflow-hidden rounded-sm border transition-colors duration-200 ${
                isCurrent
                  ? 'border-gold/35 bg-gradient-to-br from-gold/10 via-stone-950/50 to-transparent'
                  : unlocked
                    ? 'border-white/[0.08] bg-stone-950/30'
                    : 'border-white/[0.04] bg-stone-950/20 opacity-70'
              }`}
            >
              {isCurrent ? (
                <div
                  className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gold/15 blur-2xl"
                  aria-hidden="true"
                />
              ) : null}
              <div className="border-l-4 border-l-gold/50 p-5 md:p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border ${
                      isCurrent
                        ? 'border-gold/40 bg-gold/10 text-gold'
                        : 'border-white/10 bg-white/[0.03] text-stone-400'
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-display text-xl uppercase tracking-wide text-white">
                      {level.name}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">
                      Nível {level.level} · {level.min_cycles}+ ciclos
                    </p>
                  </div>
                </div>
                <ul className="mt-5 space-y-2 text-sm text-stone-300">
                  {level.bonus_pieces ? (
                    <li>+{level.bonus_pieces} peça bônus por ciclo</li>
                  ) : null}
                  {level.store_discount ? (
                    <li>{level.store_discount}% off na loja</li>
                  ) : null}
                  {level.has_vote ? <li>Voto no tema do mês</li> : null}
                  {level.has_exclusive ? <li>Peças exclusivas</li> : null}
                  {!level.bonus_pieces &&
                  !level.store_discount &&
                  !level.has_vote &&
                  !level.has_exclusive ? (
                    <li className="text-stone-500">Benefícios base do plano</li>
                  ) : null}
                </ul>
                <p
                  className={`mt-5 font-display text-[0.65rem] uppercase tracking-[0.25em] ${
                    isCurrent
                      ? 'text-gold'
                      : unlocked
                        ? 'text-emerald-400/90'
                        : 'text-stone-600'
                  }`}
                >
                  {isCurrent ? 'Seu nível' : unlocked ? 'Desbloqueado' : 'Em progresso'}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
