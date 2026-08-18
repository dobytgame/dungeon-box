import GuildLpMark from '@/components/guild-lp/GuildLpMark';
import { guildLpCopy } from '@/lib/guild-lp/copy';

export default function GuildLpHowItWorks() {
  return (
    <section
      id="como-funciona"
      className="scroll-mt-24 border-t border-white/[0.06] bg-relic-surface px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      aria-labelledby="como-funciona-title"
    >
      <div className="mx-auto max-w-[1200px]">
        <p className="flex items-center gap-2 font-cinzel text-[11px] font-semibold uppercase tracking-[0.28em] text-relic-gold">
          <GuildLpMark className="h-2.5 w-2.5" />
          {guildLpCopy.howEyebrow}
        </p>
        <h2
          id="como-funciona-title"
          className="mt-4 font-cinzel text-[clamp(1.75rem,4vw,2.75rem)] font-bold uppercase leading-[0.95] tracking-wide text-relic-parchment"
        >
          {guildLpCopy.howHeadline}
        </h2>

        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {guildLpCopy.steps.map((step) => (
            <li key={step.n} className="relative overflow-hidden pt-2">
              <span
                className="pointer-events-none absolute -left-1 -top-3 select-none font-cinzel text-7xl font-bold leading-none text-relic-gold/[0.12]"
                aria-hidden="true"
              >
                {step.n}
              </span>
              <h3 className="relative font-cinzel text-lg font-semibold uppercase tracking-wide text-relic-gold">
                {step.title}
              </h3>
              <p className="relative mt-3 text-base leading-[1.7] text-relic-parchment/85">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
