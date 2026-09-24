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
      className="relative overflow-hidden rounded-2xl border border-mesa-ember/40 bg-mesa-stone"
      aria-label={
        voted
          ? `Você votou em ${voted.name}`
          : `Votação aberta do ciclo ${poll.cycleNumber}`
      }
    >
      <div
        className="pointer-events-none absolute -right-8 top-0 select-none home-v2-display text-[clamp(5.5rem,22vw,11rem)] leading-none tracking-tighter text-mesa-ember/[0.08]"
        aria-hidden="true"
      >
        {poll.cycleNumber}
      </div>
      <div
        className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-mesa-ember/[0.12] blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-10 lg:p-8">
        <div className="min-w-0">
          <p className="home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade">
            {voted ? 'Voto registrado' : 'Votação aberta'}
            <span className="text-mesa-ash"> · </span>
            Ciclo {poll.cycleNumber}
          </p>
          <h2 className="home-v2-display mt-3 max-w-lg text-[clamp(2rem,6vw,3.25rem)] leading-[0.92] tracking-wide text-mesa-parchment">
            {voted ? (
              <>Você escolheu {voted.name}</>
            ) : (
              <>Qual tema entra na próxima caixa?</>
            )}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-mesa-ash">
            {voted
              ? `Seu voto está guardado. O resultado sai em ${formatDate(poll.endsAt)}.`
              : `Dois temas. Um voto. Aberto até ${formatDate(poll.endsAt)}.`}
          </p>
          <Link
            href="/dashboard/votacao"
            className="home-v2-display mt-6 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm bg-mesa-ember px-5 py-3 text-xs tracking-[0.1em] text-mesa-ink transition-colors duration-200 hover:bg-[#ff7a4a]"
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
                    className={`relative overflow-hidden rounded-2xl border ${
                      isPick
                        ? 'border-mesa-ember/70 shadow-[0_30px_80px_-30px_rgba(255,100,45,0.45)]'
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
                      <span className="home-v2-display absolute left-2 top-2 z-10 rotate-[-8deg] rounded-full bg-mesa-ember px-2 py-1 text-[11px] tracking-[0.16em] text-mesa-ink">
                        Seu voto
                      </span>
                    ) : null}
                    <p
                      className={`home-v2-display absolute inset-x-0 bottom-0 z-10 px-2.5 pb-2.5 text-sm leading-tight sm:px-3 sm:text-base ${
                        lost ? 'text-mesa-ash' : 'text-mesa-parchment'
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
                className="home-v2-display pointer-events-none absolute left-1/2 top-1/2 z-20 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-mesa-ember/40 bg-mesa-ink text-xs tracking-widest text-mesa-ember"
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
