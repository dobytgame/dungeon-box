import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ThemeOptionArt from '@/components/dashboard/ThemeOptionArt';
import { formatDate } from '@/lib/dashboard/format';
import type { ThemeOption } from '@/lib/theme-votes/types';

export type ThemeVoteBannerPoll = {
  cycleNumber: number;
  endsAt: string;
  options: ThemeOption[];
  votedOptionId: string | null;
};

export default function ThemeVoteBanner({ poll }: { poll: ThemeVoteBannerPoll }) {
  const voted = poll.options.find((option) => option.id === poll.votedOptionId);
  const [left, right] = poll.options;

  return (
    <section
      className="relative overflow-hidden rounded-sm border border-ember/30 bg-stone-950"
      aria-label={
        voted
          ? `Você votou em ${voted.name}`
          : `Votação aberta do ciclo ${poll.cycleNumber}`
      }
    >
      <div
        className="pointer-events-none absolute -right-8 top-0 select-none font-display text-[clamp(5.5rem,22vw,11rem)] leading-none tracking-tighter text-ember/[0.07]"
        aria-hidden="true"
      >
        {poll.cycleNumber}
      </div>
      <div
        className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-ember/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-8 top-8 h-32 w-32 rounded-full bg-frost/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-10 lg:p-8">
        <div className="min-w-0">
          <p className="font-display text-[11px] uppercase tracking-[0.32em] text-ember">
            {voted ? 'Voto registrado' : 'Votação aberta'}
            <span className="text-stone-600"> · </span>
            Ciclo {poll.cycleNumber}
          </p>
          <h2 className="mt-3 max-w-lg font-display text-3xl uppercase leading-[0.92] tracking-wide text-white sm:text-4xl">
            {voted ? (
              <>
                Você escolheu{' '}
                <span className="text-gradient-ember">{voted.name}</span>
              </>
            ) : (
              <>Qual tema entra na próxima caixa?</>
            )}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-400">
            {voted
              ? `Seu voto está guardado. O resultado sai em ${formatDate(poll.endsAt)}.`
              : `Dois temas. Um voto. Aberto até ${formatDate(poll.endsAt)}.`}
          </p>
          <Link
            href="/dashboard/votacao"
            className="mt-6 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-sm bg-ember px-5 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition-colors hover:bg-ember-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
          >
            {voted ? 'Ver meu voto' : 'Escolher agora'}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {left && right ? (
          <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {[left, right].map((option) => {
                const isPick = voted?.id === option.id;
                const lost = Boolean(voted) && !isPick;

                return (
                  <div
                    key={option.id}
                    className={`relative overflow-hidden rounded-sm border ${
                      isPick
                        ? 'border-ember/70 shadow-[0_0_28px_rgba(255,107,43,0.22)]'
                        : lost
                          ? 'border-white/5'
                          : 'border-white/10'
                    }`}
                  >
                    <ThemeOptionArt
                      name={option.name}
                      imageUrl={option.image_url}
                      dimmed={lost}
                      className="aspect-[4/5] sm:aspect-[3/4]"
                    />
                    {isPick ? (
                      <span className="absolute left-2 top-2 z-10 rotate-[-8deg] border border-ember/50 bg-stone-950/90 px-2 py-1 font-display text-[10px] uppercase tracking-[0.22em] text-ember">
                        Seu voto
                      </span>
                    ) : null}
                    <p
                      className={`absolute inset-x-0 bottom-0 z-10 px-2.5 pb-2.5 font-display text-sm uppercase leading-tight tracking-wide sm:px-3 sm:text-base ${
                        lost ? 'text-stone-500' : 'text-white'
                      }`}
                    >
                      {option.name}
                    </p>
                  </div>
                );
              })}
            </div>
            {!voted ? (
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-ember/40 bg-stone-950 font-display text-xs uppercase tracking-widest text-ember"
                aria-hidden="true"
              >
                VS
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
