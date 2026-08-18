import { Eye, Gift, Vote, Zap } from 'lucide-react';
import GuildLpMark from '@/components/guild-lp/GuildLpMark';
import { guildLpCopy } from '@/lib/guild-lp/copy';

const benefitIcons = [Eye, Vote, Zap, Gift] as const;

export default function GuildLpBenefits() {
  return (
    <section
      id="guilda"
      className="scroll-mt-24 bg-relic-ink px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      aria-labelledby="guilda-title"
    >
      <div className="mx-auto max-w-[1200px]">
        <p className="flex items-center gap-2 font-cinzel text-[11px] font-semibold uppercase tracking-[0.28em] text-relic-gold">
          <GuildLpMark className="h-2.5 w-2.5" />
          {guildLpCopy.benefitsEyebrow}
        </p>
        <h2
          id="guilda-title"
          className="mt-4 max-w-xl font-cinzel text-[clamp(1.75rem,4vw,2.75rem)] font-bold uppercase leading-[0.95] tracking-wide text-relic-parchment"
        >
          {guildLpCopy.benefitsHeadline[0]}
          <br />
          <span className="guild-gold-text">
            {guildLpCopy.benefitsHeadline[1]}
          </span>
        </h2>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {guildLpCopy.benefits.map((benefit, index) => {
            const Icon = benefitIcons[index];
            return (
              <article
                key={benefit.title}
                className="rounded-lg border border-white/[0.08] bg-relic-surface p-6"
              >
                <div className="mb-5 inline-flex rounded border border-relic-gold/30 bg-relic-gold/10 p-2.5 text-relic-gold">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-cinzel text-lg font-semibold uppercase tracking-wide text-relic-parchment">
                  {benefit.title}
                </h3>
                <p className="mt-3 text-base leading-[1.7] text-relic-muted">
                  {benefit.body}
                </p>
              </article>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm uppercase tracking-[0.16em] text-relic-muted">
          {guildLpCopy.benefitsFoot}
        </p>
      </div>
    </section>
  );
}
