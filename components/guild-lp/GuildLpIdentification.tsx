import GuildLpMark from '@/components/guild-lp/GuildLpMark';
import { guildLpCopy } from '@/lib/guild-lp/copy';

export default function GuildLpIdentification() {
  return (
    <section
      id="identificacao"
      className="scroll-mt-24 bg-relic-ink px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      aria-labelledby="identificacao-title"
    >
      <div className="mx-auto max-w-3xl">
        <p className="flex items-center gap-2 font-cinzel text-[11px] font-semibold uppercase tracking-[0.28em] text-relic-gold">
          <GuildLpMark className="h-2.5 w-2.5" />
          {guildLpCopy.idEyebrow}
        </p>
        <h2
          id="identificacao-title"
          className="mt-4 font-cinzel text-[clamp(1.75rem,4vw,2.75rem)] font-bold uppercase leading-[0.95] tracking-wide text-relic-parchment"
        >
          {guildLpCopy.idHeadline}
        </h2>

        <div className="mt-10 space-y-7 border-l border-white/10 pl-6">
          {guildLpCopy.idBody.map((paragraph) => (
            <p
              key={paragraph}
              className="max-w-[42rem] text-base leading-[1.7] text-relic-parchment/90 sm:text-lg"
            >
              {paragraph}
            </p>
          ))}
        </div>

        <p className="mt-12 font-cinzel text-xl font-semibold uppercase leading-snug tracking-wide text-relic-gold sm:text-2xl">
          {guildLpCopy.idClose}
        </p>
      </div>
    </section>
  );
}
