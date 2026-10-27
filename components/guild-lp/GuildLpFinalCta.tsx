import GuildLpCta from '@/components/guild-lp/GuildLpCta';
import GuildLpSupportLink from '@/components/guild-lp/GuildLpSupportLink';
import { guildLpCopy } from '@/lib/guild-lp/copy';
import { guildStartingPriceLabel } from '@/lib/guild-lp/plans-display';

export default function GuildLpFinalCta() {
  return (
    <section
      className="relative overflow-hidden bg-relic-ink px-5 py-16 sm:px-6 sm:py-20 lg:py-28"
      aria-labelledby="final-cta-title"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,107,43,0.14)_0%,_transparent_65%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <h2
          id="final-cta-title"
          className="font-cinzel text-[clamp(1.85rem,5vw,3.25rem)] font-bold uppercase leading-[0.95] tracking-wide text-relic-parchment"
        >
          {guildLpCopy.finalHeadline[0]}
          <br />
          {guildLpCopy.finalHeadline[1]}
          <br />
          <span className="guild-gold-text">
            {guildLpCopy.finalHeadline[2]}
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-sm text-relic-muted sm:text-base">
          {guildStartingPriceLabel()}
        </p>
        <div className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <GuildLpCta href="#planos" className="sm:min-w-[240px]">
            {guildLpCopy.finalPrimaryCta}
          </GuildLpCta>
          <GuildLpSupportLink
            position="final_cta"
            variant="secondary"
            className="sm:min-w-[240px]"
          >
            {guildLpCopy.finalSecondaryCta}
          </GuildLpSupportLink>
        </div>
      </div>
    </section>
  );
}
