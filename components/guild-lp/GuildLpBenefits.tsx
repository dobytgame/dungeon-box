import GuildLpGuildInviteLink from '@/components/guild-lp/GuildLpGuildInviteLink';
import GuildLpMark from '@/components/guild-lp/GuildLpMark';
import GuildLpSupportLink from '@/components/guild-lp/GuildLpSupportLink';
import { GUILD_WHATSAPP_URL } from '@/lib/guild-lp/constants';
import { guildLpCopy } from '@/lib/guild-lp/copy';

export default function GuildLpBenefits() {
  return (
    <section
      id="guilda"
      className="scroll-mt-24 bg-relic-ink px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      aria-labelledby="guilda-title"
    >
      <div className="mx-auto max-w-[720px] text-center">
        <p className="flex items-center justify-center gap-2 font-cinzel text-[11px] font-semibold uppercase tracking-[0.28em] text-relic-gold">
          <GuildLpMark className="h-2.5 w-2.5" />
          {guildLpCopy.benefitsEyebrow}
        </p>
        <h2
          id="guilda-title"
          className="mt-4 font-cinzel text-[clamp(1.75rem,4vw,2.75rem)] font-bold uppercase leading-[0.95] tracking-wide text-relic-parchment"
        >
          {guildLpCopy.benefitsHeadline[0]}
          <br />
          <span className="guild-gold-text">
            {guildLpCopy.benefitsHeadline[1]}
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-[1.7] text-relic-muted sm:text-lg">
          {guildLpCopy.benefitsIntro}
        </p>
        <div className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <GuildLpGuildInviteLink
            href={GUILD_WHATSAPP_URL}
            position="guild_section"
            className="sm:min-w-[260px]"
          >
            {guildLpCopy.guildInviteCta}
          </GuildLpGuildInviteLink>
          <GuildLpSupportLink
            position="guild_section"
            variant="secondary"
            className="sm:min-w-[260px]"
          >
            {guildLpCopy.benefitsSupportCta}
          </GuildLpSupportLink>
        </div>
      </div>
    </section>
  );
}
