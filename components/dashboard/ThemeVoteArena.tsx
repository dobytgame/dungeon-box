'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import ThemeOptionArt from '@/components/dashboard/ThemeOptionArt';
import { formatDate } from '@/lib/dashboard/format';
import { voteThemeAction } from '@/lib/theme-votes/actions';
import type { SubscriberThemePollView, ThemeOptionTally } from '@/lib/theme-votes/types';

interface Props {
  poll: SubscriberThemePollView;
}

function VoteCard({
  option,
  selected,
  winner,
  dimmed,
  clickable,
  submitting,
  showTallies,
  onVote,
  pending,
}: {
  option: ThemeOptionTally;
  selected: boolean;
  winner: boolean;
  dimmed: boolean;
  clickable: boolean;
  submitting: boolean;
  showTallies: boolean;
  onVote: (id: string) => void;
  pending: boolean;
}) {
  const cardClass = `group relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-sm border text-left transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none ${
    selected
      ? 'border-ember/70 shadow-[0_0_40px_rgba(255,107,43,0.18)]'
      : winner
        ? 'border-gold/50 shadow-[0_0_32px_rgba(255,214,0,0.12)]'
        : dimmed
          ? 'border-white/5'
          : 'border-white/10 hover:border-ember/40'
  }`;

  const body = (
    <>
      <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[5/6]">
        <ThemeOptionArt
          name={option.name}
          imageUrl={option.image_url}
          dimmed={dimmed}
          zoom={clickable}
          className="h-full w-full"
        />
        {selected ? (
          <span className="absolute left-4 top-4 z-10 rotate-[-8deg] border border-ember/60 bg-stone-950/90 px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.22em] text-ember">
            Seu voto
          </span>
        ) : null}
        {winner ? (
          <span className="absolute right-4 top-4 z-10 border border-gold/50 bg-stone-950/90 px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.22em] text-gold">
            Vencedor
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 border-t border-white/[0.06] bg-stone-950/80 px-4 py-4 sm:px-5 sm:py-5">
        <h3 className="font-display text-2xl uppercase leading-[0.95] tracking-wide text-white sm:text-3xl">
          {option.name}
        </h3>

        {showTallies ? (
          <p className="font-display text-xs uppercase tracking-[0.2em] text-stone-500">
            {option.voteCount} {option.voteCount === 1 ? 'voto' : 'votos'} · {option.percent}%
          </p>
        ) : null}

        {clickable ? (
          <span className="mt-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-sm bg-ember px-4 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950 transition-colors group-hover:bg-ember-bright">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              'Votar neste tema'
            )}
          </span>
        ) : selected ? (
          <p className="mt-auto inline-flex items-center gap-2 text-sm text-ember">
            <Check className="h-4 w-4" aria-hidden="true" />
            Este foi o seu voto
          </p>
        ) : null}
      </div>
    </>
  );

  if (clickable) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => onVote(option.id)}
        aria-pressed={selected}
        aria-label={`Votar em ${option.name}`}
        className={`${cardClass} cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:cursor-wait`}
      >
        {body}
      </button>
    );
  }

  return <article className={cardClass}>{body}</article>;
}

export default function ThemeVoteArena({ poll }: Props) {
  const router = useRouter();
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const [left, right] = poll.options;
  const voted = poll.options.find((option) => option.id === poll.userVoteOptionId);
  const winner = poll.options.find((option) => option.id === poll.winnerOptionId);

  function handleVote(optionId: string) {
    if (!poll.canVote || pending) return;
    setError('');
    setPendingOptionId(optionId);
    startTransition(async () => {
      const result = await voteThemeAction(poll.id, optionId);
      if ('error' in result && result.error) {
        setError(result.error);
        setPendingOptionId(null);
        return;
      }
      router.refresh();
    });
  }

  let kicker = `Ciclo ${poll.cycle_number}`;
  let title = 'Dois temas. Um voto.';
  let detail = `A guilda escolhe o tema da próxima caixa. Aberto até ${formatDate(poll.ends_at)}.`;

  if (poll.status === 'upcoming') {
    title = 'A votação ainda não abriu.';
    detail = `Os temas já estão na mesa. A escolha começa em ${formatDate(poll.starts_at)}.`;
  } else if (voted && poll.status === 'open') {
    kicker = 'Voto registrado';
    title = `Você escolheu ${voted.name}.`;
    detail = `Não dá para mudar. O resultado sai em ${formatDate(poll.ends_at)}.`;
  } else if (poll.status === 'ended') {
    kicker = 'Votação encerrada';
    title = poll.isTie
      ? 'Empate na guilda.'
      : winner
        ? `${winner.name} venceu.`
        : 'A votação encerrou.';
    detail = voted
      ? `Seu voto foi em ${voted.name}.`
      : 'Você não votou nesta rodada.';
  }

  function cardProps(option: ThemeOptionTally) {
    const selected = poll.userVoteOptionId === option.id;
    const isWinner = poll.status === 'ended' && poll.winnerOptionId === option.id;
    const lostPick = Boolean(voted) && !selected && poll.status !== 'ended';
    const lostAfterEnd = poll.status === 'ended' && !selected && !isWinner;

    return {
      option,
      selected,
      winner: isWinner,
      dimmed: lostPick || lostAfterEnd,
      clickable: poll.canVote,
      submitting: pending && pendingOptionId === option.id,
      showTallies: poll.status === 'ended',
      onVote: handleVote,
      pending,
    };
  }

  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute -right-6 -top-10 select-none font-display text-[clamp(6rem,24vw,14rem)] leading-none tracking-tighter text-white/[0.035]"
        aria-hidden="true"
      >
        {poll.cycle_number}
      </div>

      <header className="relative max-w-2xl border-b border-white/[0.06] pb-8">
        <p className="font-display text-[11px] uppercase tracking-[0.32em] text-ember">
          {kicker}
        </p>
        <h2 className="mt-3 font-display text-3xl uppercase leading-[0.92] tracking-wide text-white sm:text-4xl md:text-5xl">
          {title}
        </h2>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-400">{detail}</p>
      </header>

      <div className="relative mt-8 md:mt-10">
        {left && right ? (
          <div className="grid items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-0">
            <VoteCard {...cardProps(left)} />
            <div className="flex items-center justify-center py-1 md:px-3 lg:px-5" aria-hidden="true">
              <span className="flex h-11 w-11 items-center justify-center border border-ember/35 bg-stone-950 font-display text-sm uppercase tracking-[0.2em] text-ember md:h-12 md:w-12">
                VS
              </span>
            </div>
            <VoteCard {...cardProps(right)} />
          </div>
        ) : null}

        {error ? (
          <p className="mt-5 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        {voted && poll.status === 'open' ? (
          <p
            className="mt-6 border-l-2 border-ember/60 pl-4 text-sm leading-relaxed text-stone-400"
            role="status"
          >
            A forja já anotou sua escolha. Quando a votação fechar, o tema vencedor
            entra na caixa do ciclo {poll.cycle_number}.
          </p>
        ) : null}
      </div>
    </div>
  );
}
