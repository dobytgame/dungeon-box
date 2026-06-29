'use client';

import { Crown, Flag, Scroll, Shield, Sparkles, Trophy } from 'lucide-react';
import type { ScoreboardStats } from '@/lib/referral/scoreboard';
import type { ReferralRank } from '@/lib/referral/ranks';
import { REFERRAL_RANKS } from '@/lib/referral/ranks';

const rankIcons = {
  scroll: Scroll,
  flag: Flag,
  shield: Shield,
  crown: Crown,
  dragon: Sparkles,
};

interface Props {
  stats: ScoreboardStats;
}

function RankBadge({ rank, large }: { rank: ReferralRank; large?: boolean }) {
  const Icon = rankIcons[rank.icon];
  return (
    <div
      className={`flex items-center justify-center rounded-sm border border-gold/30 bg-gold/10 text-gold ${
        large ? 'h-16 w-16' : 'h-10 w-10'
      }`}
    >
      <Icon className={large ? 'h-8 w-8' : 'h-5 w-5'} strokeWidth={1.5} aria-hidden="true" />
    </div>
  );
}

export default function ReferralScoreboard({ stats }: Props) {
  const { rank, balance, lifetimeEarned, totalVisits, totalConversions, pendingReferrals, monthlyQualified } =
    stats;

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Hero rank card */}
      <section className="relative overflow-hidden rounded-sm border border-gold/20 bg-gradient-to-br from-gold/10 via-stone-950/80 to-stone-950 p-6 md:p-8">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gold/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <RankBadge rank={rank.current} large />
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-gold/80">
                Seu rank
              </p>
              <h2 className="font-display text-3xl uppercase tracking-wide text-white md:text-4xl">
                {rank.current.name}
              </h2>
              <p className="mt-2 max-w-md text-sm text-stone-400">
                {rank.current.description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
            <StatPill label="Saldo" value={`${balance}`} suffix="pts" accent="gold" />
            <StatPill label="Ganhos" value={`${lifetimeEarned}`} suffix="pts" />
            <StatPill label="Visitas" value={`${totalVisits}`} />
            <StatPill label="Conversões" value={`${totalConversions}`} />
            <StatPill label="Este mês" value={`${monthlyQualified}`} suffix="/5" />
          </div>
        </div>

        {rank.next ? (
          <div className="relative mt-8">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-stone-500">
              <span>Próximo: {rank.next.name}</span>
              <span>{rank.remaining} conversão(ões) restante(s)</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold/80 to-ember transition-all duration-700"
                style={{ width: `${rank.progress}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="relative mt-6 font-display text-xs uppercase tracking-[0.25em] text-gold">
            Rank máximo alcançado
          </p>
        )}
      </section>

      {/* Rank evolution path */}
      <section className="rounded-sm border border-white/[0.06] bg-stone-950/40 p-5 md:p-6">
        <h3 className="font-display text-lg uppercase tracking-wide text-white">
          Evolução de rank
        </h3>
        <p className="mt-2 text-sm text-stone-500">
          Cada indicação qualificada conta para subir de nível no placar da guilda.
        </p>

        <ol className="mt-6 flex flex-col gap-0 md:flex-row md:items-start md:justify-between">
          {REFERRAL_RANKS.map((tier, index) => {
            const unlocked = totalConversions >= tier.minConversions;
            const isCurrent = tier.level === rank.current.level;
            const Icon = rankIcons[tier.icon];

            return (
              <li
                key={tier.slug}
                className={`relative flex flex-1 flex-col items-center px-2 py-4 text-center ${
                  index < REFERRAL_RANKS.length - 1
                    ? 'md:border-r md:border-white/[0.06]'
                    : ''
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${
                    isCurrent
                      ? 'border-gold bg-gold/15 text-gold shadow-[0_0_24px_rgba(212,175,55,0.2)]'
                      : unlocked
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                        : 'border-white/10 bg-stone-950 text-stone-600'
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <p
                  className={`mt-3 font-display text-sm uppercase tracking-widest ${
                    isCurrent ? 'text-gold' : unlocked ? 'text-white' : 'text-stone-600'
                  }`}
                >
                  {tier.name}
                </p>
                <p className="mt-1 text-[11px] text-stone-500">
                  {tier.minConversions === 0
                    ? 'Início'
                    : `${tier.minConversions}+ conversões`}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Leaderboard */}
        <section className="rounded-sm border border-white/[0.06] bg-stone-950/40 p-5 md:p-6">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-gold" aria-hidden="true" />
            <h3 className="font-display text-lg uppercase tracking-wide text-white">
              Placar da guilda
            </h3>
          </div>
          <p className="mt-2 text-sm text-stone-500">
            Top emissários por conversões qualificadas.
          </p>

          {stats.leaderboard.length === 0 ? (
            <p className="mt-6 text-sm text-stone-500">
              Seja o primeiro a aparecer no placar — compartilhe seu link!
            </p>
          ) : (
            <ol className="mt-6 space-y-2">
              {stats.leaderboard.map((entry) => (
                <li
                  key={`${entry.userId}-${entry.rank}`}
                  className={`flex items-center justify-between rounded-sm border px-4 py-3 ${
                    entry.isCurrentUser
                      ? 'border-gold/30 bg-gold/5'
                      : 'border-white/[0.04] bg-stone-950/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-sm font-display text-sm ${
                        entry.rank <= 3
                          ? 'bg-gold/15 text-gold'
                          : 'bg-white/[0.04] text-stone-500'
                      }`}
                    >
                      {entry.rank}
                    </span>
                    <span
                      className={`text-sm ${
                        entry.isCurrentUser ? 'font-medium text-gold' : 'text-stone-300'
                      }`}
                    >
                      {entry.isCurrentUser ? 'Você' : entry.displayName}
                    </span>
                  </div>
                  <span className="font-display text-sm text-stone-400">
                    {entry.conversions}{' '}
                    <span className="text-xs text-stone-600">conv.</span>
                  </span>
                </li>
              ))}
            </ol>
          )}

          {stats.userLeaderboardRank && stats.userLeaderboardRank > 10 ? (
            <p className="mt-4 text-xs text-stone-500">
              Sua posição geral: #{stats.userLeaderboardRank}
            </p>
          ) : null}
        </section>

        {/* Activity timeline */}
        <section className="rounded-sm border border-white/[0.06] bg-stone-950/40 p-5 md:p-6">
          <h3 className="font-display text-lg uppercase tracking-wide text-white">
            Evolução de pontos
          </h3>
          <p className="mt-2 text-sm text-stone-500">
            Histórico recente de créditos e resgates.
          </p>

          {stats.activity.length === 0 ? (
            <p className="mt-6 text-sm text-stone-500">
              Nenhuma movimentação ainda.{' '}
              {pendingReferrals > 0
                ? `${pendingReferrals} indicação(ões) aguardando qualificação.`
                : 'Compartilhe seu link para começar.'}
            </p>
          ) : (
            <ul className="mt-6 space-y-0">
              {stats.activity.map((item, index) => {
                const isCredit = item.amount > 0;
                return (
                  <li
                    key={item.id}
                    className="relative flex gap-4 pb-6 last:pb-0"
                  >
                    {index < stats.activity.length - 1 ? (
                      <span
                        className="absolute left-[11px] top-6 h-full w-px bg-white/[0.06]"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span
                      className={`relative z-10 mt-1 h-[22px] w-[22px] shrink-0 rounded-full border-2 ${
                        isCredit
                          ? 'border-emerald-500/50 bg-emerald-500/20'
                          : 'border-red-500/30 bg-red-500/10'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm text-stone-300">{item.description}</p>
                        <p
                          className={`font-display text-sm ${
                            isCredit ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {isCredit ? '+' : ''}
                          {item.amount} pts
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-stone-600">
                        {new Date(item.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent?: 'gold';
}) {
  return (
    <div className="rounded-sm border border-white/[0.06] bg-stone-950/50 px-3 py-3 text-center">
      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">{label}</p>
      <p
        className={`mt-1 font-display text-xl ${
          accent === 'gold' ? 'text-gold' : 'text-white'
        }`}
      >
        {value}
        {suffix ? (
          <span className="ml-0.5 text-sm text-stone-500">{suffix}</span>
        ) : null}
      </p>
    </div>
  );
}
