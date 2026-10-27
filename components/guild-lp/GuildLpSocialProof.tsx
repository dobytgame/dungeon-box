import GuildLpMark from '@/components/guild-lp/GuildLpMark';
import { guildLpCopy } from '@/lib/guild-lp/copy';
import type { HomeV2Testimonial } from '@/lib/home-v2/content';

interface Props {
  testimonials: HomeV2Testimonial[];
}

export default function GuildLpSocialProof({ testimonials }: Props) {
  if (testimonials.length === 0) {
    return null;
  }

  const featured = testimonials[0]!;
  const others = testimonials.slice(1, 4);
  const average =
    testimonials.reduce((sum, item) => sum + item.rating, 0) / testimonials.length;
  const averageLabel = average.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <section
      id="prova"
      className="scroll-mt-24 border-t border-white/[0.06] bg-relic-surface px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      aria-labelledby="prova-title"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 font-cinzel text-[11px] font-semibold uppercase tracking-[0.28em] text-relic-gold">
              <GuildLpMark className="h-2.5 w-2.5" />
              {guildLpCopy.proofLabel}
            </p>
            <h2
              id="prova-title"
              className="mt-4 font-cinzel text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold uppercase leading-[0.95] tracking-wide text-relic-parchment"
            >
              Avaliações de assinantes
            </h2>
          </div>
          <p className="text-sm text-relic-muted">
            <span className="font-cinzel text-2xl font-bold text-relic-gold">
              {averageLabel}
            </span>{' '}
            · {testimonials.length} avaliações
          </p>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-14">
          <blockquote className="relative lg:col-span-7">
            <span
              className="pointer-events-none absolute -left-2 -top-8 select-none font-cinzel text-[7rem] leading-none text-relic-gold/15 sm:-left-4 sm:text-[9rem]"
              aria-hidden="true"
            >
              “
            </span>
            <p className="relative text-xl leading-[1.55] text-relic-parchment sm:text-2xl sm:leading-[1.5]">
              {featured.quote}
            </p>
            <footer className="relative mt-8 border-t border-relic-gold/25 pt-5">
              <cite className="not-italic">
                <span className="block font-cinzel text-base font-semibold uppercase tracking-wide text-relic-gold">
                  {featured.name}
                </span>
                {featured.context ? (
                  <span className="mt-1 block text-sm text-relic-muted">
                    {featured.context}
                  </span>
                ) : null}
              </cite>
            </footer>
          </blockquote>

          {others.length > 0 ? (
            <div className="flex flex-col gap-6 lg:col-span-5 lg:justify-center">
              {others.map((item) => (
                <blockquote
                  key={item.id}
                  className="border-l border-relic-gold/30 pl-5"
                >
                  <p className="text-base leading-[1.65] text-relic-parchment/90">
                    “{item.quote.length > 220 ? `${item.quote.slice(0, 217)}…` : item.quote}”
                  </p>
                  <footer className="mt-3">
                    <cite className="not-italic text-sm text-relic-muted">
                      <span className="font-semibold text-relic-parchment">
                        {item.name}
                      </span>
                      {item.context ? <span> · {item.context}</span> : null}
                    </cite>
                  </footer>
                </blockquote>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
