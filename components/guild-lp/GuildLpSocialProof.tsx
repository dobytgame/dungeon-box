import GuildLpMark from '@/components/guild-lp/GuildLpMark';
import { guildLpCopy } from '@/lib/guild-lp/copy';

export default function GuildLpSocialProof() {
  const featured = guildLpCopy.featuredQuote;

  return (
    <section
      id="prova"
      className="scroll-mt-24 border-t border-white/[0.06] bg-relic-surface px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      aria-labelledby="prova-title"
    >
      <div className="mx-auto max-w-[1200px]">
        <p className="flex items-center gap-2 font-cinzel text-[11px] font-semibold uppercase tracking-[0.28em] text-relic-gold">
          <GuildLpMark className="h-2.5 w-2.5" />
          {guildLpCopy.proofLabel}
        </p>
        <h2 id="prova-title" className="sr-only">
          Depoimentos de mestres da Guilda
        </h2>

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-14">
          <blockquote className="relative lg:col-span-7">
            <span
              className="pointer-events-none absolute -left-2 -top-8 select-none font-cinzel text-[7rem] leading-none text-relic-gold/15 sm:-left-4 sm:text-[9rem]"
              aria-hidden="true"
            >
              “
            </span>
            <p className="relative text-xl leading-[1.55] text-relic-parchment sm:text-2xl sm:leading-[1.5]">
              {featured.text}
            </p>
            <footer className="relative mt-8 border-t border-relic-gold/25 pt-5">
              <cite className="not-italic">
                <span className="block font-cinzel text-base font-semibold uppercase tracking-wide text-relic-gold">
                  {featured.author}
                </span>
                <span className="mt-1 block text-sm text-relic-muted">
                  {featured.meta}
                </span>
              </cite>
            </footer>
          </blockquote>

          <div className="flex flex-col gap-6 lg:col-span-5 lg:justify-center">
            {guildLpCopy.compactQuotes.map((item) => (
              <blockquote
                key={item.author}
                className="border-l border-relic-gold/30 pl-5"
              >
                <p className="text-base leading-[1.65] text-relic-parchment/90">
                  “{item.text}”
                </p>
                <footer className="mt-3">
                  <cite className="not-italic text-sm text-relic-muted">
                    <span className="font-semibold text-relic-parchment">
                      {item.author}
                    </span>
                    <span> · {item.meta}</span>
                  </cite>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
