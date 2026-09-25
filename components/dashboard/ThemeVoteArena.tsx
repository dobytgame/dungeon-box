'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Expand, Loader2 } from 'lucide-react';
import HomeV2PhotoViewer from '@/components/home-v2/HomeV2PhotoViewer';
import ThemeOptionArt from '@/components/dashboard/ThemeOptionArt';
import { mesaPrimaryButton } from '@/lib/dashboard/ui';
import { formatDate } from '@/lib/dashboard/format';
import { voteThemeAction } from '@/lib/theme-votes/actions';
import type { SubscriberThemePollView, ThemeOptionTally } from '@/lib/theme-votes/types';

interface Props {
  poll: SubscriberThemePollView;
}

function VoteCard({
  option,
  selected,
  committed,
  winner,
  dimmed,
  canSelect,
  onSelect,
  onView,
}: {
  option: ThemeOptionTally;
  selected: boolean;
  committed: boolean;
  winner: boolean;
  dimmed: boolean;
  canSelect: boolean;
  onSelect: () => void;
  onView: (() => void) | null;
}) {
  const cardClass = `relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border text-left transition-[border-color,box-shadow] duration-200 ${
    selected
      ? 'border-mesa-ember/70 shadow-[0_30px_80px_-30px_rgba(255,100,45,0.45)]'
      : winner
        ? 'border-gold/50'
        : dimmed
          ? 'border-white/5'
          : 'border-white/10'
  }`;

  return (
    <article className={cardClass}>
      <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[5/6]">
        {onView ? (
          <button
            type="button"
            onClick={onView}
            aria-label={`Ver arte de ${option.name} em tela cheia`}
            className="group absolute inset-0 cursor-pointer"
          >
            <ThemeOptionArt
              name={option.name}
              imageUrl={option.image_url}
              dimmed={dimmed}
              zoom
              className="h-full w-full"
            />
            <span className="absolute bottom-3 right-3 z-10 inline-flex min-h-11 items-center gap-2 rounded-sm border border-white/15 bg-mesa-ink/80 px-3 text-sm text-mesa-parchment backdrop-blur-sm">
              <Expand className="size-4" aria-hidden="true" />
              Ampliar
            </span>
          </button>
        ) : (
          <ThemeOptionArt
            name={option.name}
            imageUrl={option.image_url}
            dimmed={dimmed}
            className="h-full w-full"
          />
        )}
        {committed ? (
          <span className="home-v2-display pointer-events-none absolute left-4 top-4 z-10 rotate-[-8deg] rounded-full bg-mesa-ember px-3 py-1.5 text-[11px] tracking-[0.16em] text-mesa-ink">
            Seu voto
          </span>
        ) : null}
        {winner ? (
          <span className="home-v2-display pointer-events-none absolute right-4 top-4 z-10 rounded-full border border-gold/50 bg-mesa-ink/90 px-3 py-1.5 text-[11px] tracking-[0.16em] text-gold">
            Vencedor
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 border-t border-white/[0.06] bg-mesa-stone px-4 py-4 sm:px-5 sm:py-5">
        <h3 className="home-v2-display text-2xl leading-none text-mesa-parchment sm:text-3xl">
          {option.name}
        </h3>

        {canSelect ? (
          <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-sm px-4 home-v2-display text-[11px] tracking-[0.12em] transition-colors duration-200 ${
              selected
                ? 'bg-mesa-ember text-mesa-ink'
                : 'border border-white/15 text-mesa-parchment hover:border-white/30'
            }`}
          >
            {selected ? 'Tema selecionado' : 'Selecionar tema'}
          </button>
        ) : committed ? (
          <p className="mt-auto inline-flex items-center gap-2 text-sm text-mesa-ember">
            <Check className="size-4" aria-hidden="true" />
            Este foi o seu voto
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default function ThemeVoteArena({ poll }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(poll.userVoteOptionId);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const [left, right] = poll.options;
  const voted = poll.options.find((option) => option.id === poll.userVoteOptionId);
  const winner = poll.options.find((option) => option.id === poll.winnerOptionId);
  const selected = poll.options.find((option) => option.id === selectedId);
  const canPick = poll.canVote || poll.canChangeVote;
  const isChange = Boolean(poll.userVoteOptionId) && selectedId !== poll.userVoteOptionId;
  const canConfirm =
    canPick &&
    Boolean(selectedId) &&
    selectedId !== poll.userVoteOptionId &&
    !pending;

  const photos = useMemo(
    () =>
      poll.options.flatMap((option) =>
        option.image_url
          ? [{ src: option.image_url, alt: `Arte do tema ${option.name}`, optionId: option.id }]
          : []
      ),
    [poll.options]
  );

  function handleConfirm() {
    if (!selectedId || !canConfirm) return;
    setError('');
    startTransition(async () => {
      const result = await voteThemeAction(poll.id, selectedId);
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  let kicker = `Ciclo ${poll.cycle_number}`;
  let title = 'Dois temas. Um voto.';
  let detail = `Escolha o tema, confirme o voto e, se quiser, troque uma vez. Aberto até ${formatDate(poll.ends_at)}.`;

  if (poll.status === 'upcoming') {
    title = 'A votação ainda não abriu.';
    detail = `Os temas já estão na mesa. A escolha começa em ${formatDate(poll.starts_at)}.`;
  } else if (voted && poll.status === 'open') {
    kicker = 'Voto registrado';
    title = `Você escolheu ${voted.name}.`;
    detail = poll.canChangeVote
      ? `Ainda dá para trocar uma vez: selecione o outro tema e confirme. O resultado sai em ${formatDate(poll.ends_at)}.`
      : `Você já usou a troca. O resultado sai em ${formatDate(poll.ends_at)}.`;
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

  function openViewer(optionId: string) {
    const index = photos.findIndex((photo) => photo.optionId === optionId);
    if (index >= 0) setViewerIndex(index);
  }

  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute -right-6 -top-10 select-none home-v2-display text-[clamp(6rem,24vw,14rem)] leading-none tracking-tighter text-mesa-parchment/[0.04]"
        aria-hidden="true"
      >
        {poll.cycle_number}
      </div>

      <header className="relative max-w-2xl">
        <p className="home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade">{kicker}</p>
        <h2 className="home-v2-display mt-3 text-[clamp(2rem,7vw,3.4rem)] leading-[0.92] tracking-wide text-mesa-parchment">
          {title}
        </h2>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-mesa-ash">{detail}</p>
        <p className="mt-5 max-w-xl border-l-2 border-white/15 pl-4 text-sm leading-relaxed text-mesa-ash">
          A quantidade de peças de cada plano e o tempo de produção serão
          analisados depois da escolha do novo kit. O voto define o tema; o
          set de cada plano vem na sequência.
        </p>
        <div className="home-v2-hairline mt-8 h-px" aria-hidden="true" />
      </header>

      <div className="relative mt-8 md:mt-10">
        {left && right ? (
          <div className="grid items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-0">
            {[left, right].map((option, index) => {
              const committed = poll.userVoteOptionId === option.id;
              const isWinner = poll.status === 'ended' && poll.winnerOptionId === option.id;
              const lostPick =
                Boolean(voted) && !committed && !poll.canChangeVote && poll.status !== 'ended';
              const lostAfterEnd = poll.status === 'ended' && !committed && !isWinner;

              return (
                <div key={option.id} className="contents">
                  {index === 1 ? (
                    <div className="flex items-center justify-center py-1 md:px-3 lg:px-5" aria-hidden="true">
                      <span className="home-v2-display flex size-11 items-center justify-center border border-mesa-ember/35 bg-mesa-ink text-sm tracking-[0.2em] text-mesa-ember md:size-12">
                        VS
                      </span>
                    </div>
                  ) : null}
                  <VoteCard
                    option={option}
                    selected={selectedId === option.id}
                    committed={committed}
                    winner={isWinner}
                    dimmed={lostPick || lostAfterEnd}
                    canSelect={canPick}
                    onSelect={() => setSelectedId(option.id)}
                    onView={option.image_url ? () => openViewer(option.id) : null}
                  />
                </div>
              );
            })}
          </div>
        ) : null}

        {canConfirm && selected ? (
          <div className="mt-6 rounded-2xl border border-mesa-ember/40 bg-mesa-stone px-5 py-5">
            <p className="home-v2-display text-[11px] tracking-[0.18em] text-mesa-jade">
              {isChange ? 'Confirmar troca' : 'Confirmar voto'}
            </p>
            <p className="mt-2 text-base text-mesa-parchment">
              {isChange
                ? `Trocar para ${selected.name}? Você só pode fazer isso uma vez.`
                : `Confirmar voto em ${selected.name}?`}
            </p>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className={`${mesaPrimaryButton} mt-4`}
            >
              {pending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Salvando…
                </span>
              ) : isChange ? (
                'Confirmar troca de voto'
              ) : (
                'Confirmar voto'
              )}
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="mt-5 text-sm text-mesa-ember" role="alert">
            {error}
          </p>
        ) : null}

        {voted && poll.status === 'open' ? (
          <p
            className="mt-6 border-l-2 border-mesa-ember/60 pl-4 text-sm leading-relaxed text-mesa-ash"
            role="status"
          >
            {poll.canChangeVote
              ? 'A forja já anotou sua escolha. Ainda dá para trocar uma vez antes do encerramento.'
              : `A troca já foi usada. Quando a votação fechar, o tema vencedor entra na caixa do ciclo ${poll.cycle_number}.`}
          </p>
        ) : null}
      </div>

      {viewerIndex !== null && photos[viewerIndex] ? (
        <HomeV2PhotoViewer
          eyebrow="Votação de tema"
          title={photos[viewerIndex]?.alt.replace('Arte do tema ', '') ?? 'Tema'}
          photos={photos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          previewSizes="(max-width: 768px) 100vw, 50vw"
        />
      ) : null}
    </div>
  );
}
