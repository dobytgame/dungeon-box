import Link from 'next/link';
import { ArrowRight, Check, Crown } from 'lucide-react';
import ThemeOptionArt from '@/components/dashboard/ThemeOptionArt';
import { formatDate } from '@/lib/dashboard/format';
import {
  formatValidVotePercent,
  validVoteShare,
} from '@/lib/theme-votes/tally';
import type { ThemeOptionTally } from '@/lib/theme-votes/types';

export type ThemeVoteResultPoll = {
  cycle_number: number;
  ends_at: string;
  totalVotes: number;
  isTie: boolean;
  winnerOptionId: string | null;
  options: ThemeOptionTally[];
  userVoteOptionId: string | null;
};

interface Props {
  poll: ThemeVoteResultPoll;
  variant?: 'home' | 'full';
}

function shareOf(option: ThemeOptionTally, total: number) {
  return validVoteShare(option.voteCount, total);
}

function percentOf(option: ThemeOptionTally, total: number) {
  return formatValidVotePercent(shareOf(option, total));
}

function voteLabel(count: number) {
  return `${count} ${count === 1 ? 'voto válido' : 'votos válidos'}`;
}

function ResultSplitBar({
  options,
  totalVotes,
  winnerOptionId,
  isTie,
}: {
  options: ThemeOptionTally[];
  totalVotes: number;
  winnerOptionId: string | null;
  isTie: boolean;
}) {
  if (options.length < 2 || totalVotes <= 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        {options.map((option, index) => {
          const lead = isTie || option.id === winnerOptionId;
          return (
            <p
              key={option.id}
              className={`min-w-0 max-w-[45%] font-display text-xs uppercase tracking-[0.16em] ${
                index === 1 ? 'text-right' : ''
              } ${lead ? 'text-gold' : 'text-stone-500'}`}
            >
              <span className="block truncate">{option.name}</span>
              <span className="mt-1 block text-lg tracking-wide text-inherit sm:text-xl">
                {percentOf(option, totalVotes)}%
              </span>
            </p>
          );
        })}
      </div>
      <div
        className="flex h-2.5 overflow-hidden rounded-sm bg-white/[0.06]"
        role="img"
        aria-label={options
          .map(
            (option) =>
              `${option.name} ${percentOf(option, totalVotes)} por cento dos votos válidos`
          )
          .join('. ')}
      >
        {options.map((option, index) => {
          const lead = isTie || option.id === winnerOptionId;
          return (
            <div
              key={option.id}
              className={`h-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${
                isTie
                  ? index === 0
                    ? 'bg-gold'
                    : 'bg-gold/35'
                  : lead
                    ? 'bg-gold'
                    : 'bg-white/20'
              }`}
              style={{ width: `${Math.min(100, shareOf(option, totalVotes))}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

function ResultPoster({
  option,
  totalVotes,
  isWinner,
  isTie,
  isUserPick,
  priority = false,
}: {
  option: ThemeOptionTally;
  totalVotes: number;
  isWinner: boolean;
  isTie: boolean;
  isUserPick: boolean;
  priority?: boolean;
}) {
  const percent = percentOf(option, totalVotes);

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-sm border ${
        isWinner || isTie
          ? 'border-gold/55 shadow-[0_0_36px_rgba(255,214,0,0.12)]'
          : 'border-white/[0.08]'
      }`}
    >
      <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[5/6]">
        <ThemeOptionArt
          name={option.name}
          imageUrl={option.image_url}
          dimmed={!isWinner && !isTie}
          priority={priority}
          className="h-full w-full"
        />
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2 sm:left-4 sm:top-4">
          {isWinner || isTie ? (
            <span className="inline-flex min-h-[32px] items-center gap-1.5 border border-gold/60 bg-stone-950/90 px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.2em] text-gold">
              <Crown className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.75} />
              {isTie ? 'Empate' : 'Vencedor'}
            </span>
          ) : (
            <span className="inline-flex min-h-[32px] items-center border border-white/15 bg-stone-950/80 px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.2em] text-stone-400">
              2º lugar
            </span>
          )}
        </div>
        {isUserPick ? (
          <span className="absolute right-3 top-3 z-10 inline-flex min-h-[32px] items-center gap-1 border border-ember/60 bg-stone-950/90 px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.2em] text-ember sm:right-4 sm:top-4">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Seu voto
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col border-t border-white/[0.06] bg-stone-950 px-4 py-5 sm:px-5 sm:py-6">
        <h3
          className={`font-display text-2xl uppercase leading-[0.95] tracking-wide sm:text-3xl ${
            isWinner || isTie ? 'text-white' : 'text-stone-400'
          }`}
        >
          {option.name}
        </h3>
        <p
          className={`mt-4 font-display text-5xl leading-none tracking-tight sm:text-6xl ${
            isWinner || isTie ? 'text-gold' : 'text-stone-500'
          }`}
        >
          {percent}
          <span className="text-[0.38em] tracking-[0.12em]">%</span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          {voteLabel(option.voteCount)}
        </p>
      </div>
    </article>
  );
}

function HomeResult({ poll }: { poll: ThemeVoteResultPoll }) {
  const winner = poll.options.find((option) => option.id === poll.winnerOptionId);
  const userPick = poll.options.find((option) => option.id === poll.userVoteOptionId);
  const lead = winner ?? poll.options[0];
  if (!lead) return null;

  const percent = percentOf(lead, poll.totalVotes);

  return (
    <section
      className="relative overflow-hidden rounded-sm border border-gold/25 bg-stone-950"
      aria-labelledby="theme-vote-result-title"
    >
      <div
        className="pointer-events-none absolute -right-10 top-0 font-display text-[clamp(5rem,20vw,9rem)] leading-none tracking-tighter text-gold/[0.06]"
        aria-hidden="true"
      >
        {poll.cycle_number}
      </div>

      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-10 lg:p-8">
        <div className="min-w-0">
          <p className="font-display text-[11px] uppercase tracking-[0.32em] text-gold">
            Votação encerrada
            <span className="text-stone-600"> · </span>
            Ciclo {poll.cycle_number}
          </p>
          <h2
            id="theme-vote-result-title"
            className="mt-3 max-w-lg font-display text-3xl uppercase leading-[0.92] tracking-wide text-white sm:text-4xl"
          >
            {poll.isTie ? (
              'Empate na guilda.'
            ) : (
              <>
                <span className="text-gold">{lead.name}</span> venceu.
              </>
            )}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-400">
            {poll.isTie
              ? `${poll.totalVotes} votos válidos. A guilda ficou dividida.`
              : `${percent}% dos votos válidos · ${voteLabel(poll.totalVotes)}.`}{' '}
            Encerrada em {formatDate(poll.ends_at)}.
          </p>
          {userPick ? (
            <p className="mt-4 text-sm text-stone-300" role="status">
              Você votou em {userPick.name}.
            </p>
          ) : null}
          <Link
            href="/dashboard/votacao"
            className="mt-6 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-sm bg-gold px-5 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition-colors duration-200 hover:bg-ember focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Ver apuração
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none">
          <div className="relative overflow-hidden rounded-sm border border-gold/40">
            <ThemeOptionArt
              name={lead.name}
              imageUrl={lead.image_url}
              className="aspect-[4/5]"
              priority
            />
            <div className="absolute left-3 top-3 z-10">
              <span className="inline-flex items-center gap-1.5 border border-gold/60 bg-stone-950/90 px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.2em] text-gold">
                <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                {poll.isTie ? 'Empate' : 'Vencedor'}
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 z-10 p-4">
              <p className="font-display text-4xl leading-none tracking-tight text-gold">
                {percent}
                <span className="text-[0.4em]">%</span>
              </p>
              <p className="mt-1 text-xs text-stone-300">dos votos válidos</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FullResult({ poll }: { poll: ThemeVoteResultPoll }) {
  const winner = poll.options.find((option) => option.id === poll.winnerOptionId);
  const userPick = poll.options.find((option) => option.id === poll.userVoteOptionId);
  const ranked = [...poll.options].sort((a, b) => {
    if (poll.isTie) return a.sort_order - b.sort_order;
    if (a.id === poll.winnerOptionId) return -1;
    if (b.id === poll.winnerOptionId) return 1;
    return b.voteCount - a.voteCount;
  });
  const [first, second] = ranked;

  return (
    <div className="space-y-8 md:space-y-10">
      <header className="max-w-2xl">
        <p className="font-display text-[11px] uppercase tracking-[0.32em] text-gold">
          Encerrada
          <span className="text-stone-600"> · </span>
          Ciclo {poll.cycle_number}
          <span className="text-stone-600"> · </span>
          {formatDate(poll.ends_at)}
        </p>
        <h2
          id="theme-vote-result-title"
          className="mt-3 font-display text-3xl uppercase leading-[0.92] tracking-wide text-white sm:text-4xl md:text-[2.75rem]"
        >
          {poll.isTie ? (
            'A guilda empatou.'
          ) : winner ? (
            <>
              <span className="text-gold">{winner.name}</span> venceu.
            </>
          ) : (
            'A votação encerrou.'
          )}
        </h2>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-400">
          {poll.totalVotes === 0
            ? 'Nenhum voto válido nesta rodada.'
            : poll.isTie
              ? `${voteLabel(poll.totalVotes)} — os dois temas ficaram iguais.`
              : winner
                ? `${percentOf(winner, poll.totalVotes)}% dos votos válidos. Um voto por assinante.`
                : voteLabel(poll.totalVotes)}
        </p>
        {userPick ? (
          <p
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 text-sm leading-relaxed text-stone-300"
            role="status"
          >
            <Check className="h-4 w-4 shrink-0 text-ember" aria-hidden="true" />
            {winner && userPick.id === winner.id && !poll.isTie
              ? `Seu voto em ${userPick.name} ficou com a maioria.`
              : `Você votou em ${userPick.name}.`}
          </p>
        ) : null}
      </header>

      <ResultSplitBar
        options={ranked}
        totalVotes={poll.totalVotes}
        winnerOptionId={poll.winnerOptionId}
        isTie={poll.isTie}
      />

      {first && second ? (
        <div className="grid items-stretch gap-4 md:grid-cols-2 md:gap-6">
          {[first, second].map((option, index) => (
            <ResultPoster
              key={option.id}
              option={option}
              totalVotes={poll.totalVotes}
              isWinner={option.id === poll.winnerOptionId}
              isTie={poll.isTie}
              isUserPick={option.id === poll.userVoteOptionId}
              priority={index === 0}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ThemeVoteResult({ poll, variant = 'full' }: Props) {
  if (variant === 'home') {
    return <HomeResult poll={poll} />;
  }

  return <FullResult poll={poll} />;
}
