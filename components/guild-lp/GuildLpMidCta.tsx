import GuildLpCta from '@/components/guild-lp/GuildLpCta';
import { GUILD_WHATSAPP_URL } from '@/lib/guild-lp/constants';
import { guildLpCopy } from '@/lib/guild-lp/copy';

export default function GuildLpMidCta() {
  return (
    <section
      id="captura"
      className="scroll-mt-24 bg-relic-ink px-5 py-16 sm:px-6 sm:py-20 lg:py-24"
      aria-labelledby="captura-title"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="relative overflow-hidden rounded-lg border border-relic-gold/25 bg-relic-surface px-6 py-12 text-center sm:px-10 sm:py-16">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,107,43,0.12)_0%,_transparent_62%)]"
            aria-hidden="true"
          />
          <div className="relative">
            <h2
              id="captura-title"
              className="font-cinzel text-[clamp(1.75rem,4vw,2.75rem)] font-bold uppercase leading-[0.95] tracking-wide text-relic-parchment"
            >
              {guildLpCopy.midHeadline}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-[1.7] text-relic-muted sm:text-lg">
              {guildLpCopy.midSub}
            </p>
            <div className="mx-auto mt-8 max-w-md">
              <GuildLpCta href={GUILD_WHATSAPP_URL}>
                {guildLpCopy.midCta}
              </GuildLpCta>
              <p className="mt-3 text-sm text-relic-muted">
                {guildLpCopy.midSupport}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
