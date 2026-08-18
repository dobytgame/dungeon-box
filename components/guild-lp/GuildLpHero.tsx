import { ChevronDown } from 'lucide-react';
import GuildLpCta from '@/components/guild-lp/GuildLpCta';
import GuildLpHeroBackdrop from '@/components/guild-lp/GuildLpHeroBackdrop';
import GuildLpMark from '@/components/guild-lp/GuildLpMark';
import { GUILD_WHATSAPP_URL } from '@/lib/guild-lp/constants';
import { guildLpCopy, guildSocialBadge } from '@/lib/guild-lp/copy';

interface Props {
  memberCount: number;
}

export default function GuildLpHero({ memberCount }: Props) {
  return (
    <section
      className="guild-grain relative isolate min-h-[100dvh] overflow-hidden bg-relic-ink"
      aria-labelledby="guild-hero-title"
    >
      <GuildLpHeroBackdrop />
      <div
        className="absolute inset-0 bg-gradient-to-r from-relic-ink via-relic-ink/88 to-relic-ink/55 lg:via-relic-ink/78 lg:to-relic-ink/15"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-relic-ink via-relic-ink/20 to-relic-ink/55"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[1200px] flex-col justify-center px-5 pb-24 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        <p className="mb-5 inline-flex max-w-full items-center gap-2 font-cinzel text-[11px] font-semibold uppercase tracking-[0.22em] text-relic-gold sm:text-xs sm:tracking-[0.28em]">
          <GuildLpMark className="h-2.5 w-2.5 shrink-0" />
          {guildLpCopy.heroEyebrow}
        </p>

        <h1
          id="guild-hero-title"
          className="max-w-3xl font-cinzel text-[clamp(2.25rem,6vw,4rem)] font-bold uppercase leading-[0.95] tracking-wide text-relic-parchment"
        >
          <span className="block">{guildLpCopy.heroHeadline[0]}</span>
          <span className="block">{guildLpCopy.heroHeadline[1]}</span>
          <span className="guild-gold-text mt-1 block">
            {guildLpCopy.heroHeadline[2]}
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-base leading-[1.7] text-relic-parchment/90 sm:text-lg">
          {guildLpCopy.heroSub}
        </p>

        <p className="mt-5 flex max-w-xl flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-relic-gold sm:text-[13px] sm:tracking-[0.12em]">
          <span className="inline-flex items-center gap-1.5">
            <GuildLpMark className="h-2 w-2" />
            {guildSocialBadge(memberCount)}
          </span>
          <span className="text-relic-faint" aria-hidden="true">
            ·
          </span>
          <span>
            {guildLpCopy.systems.join(' · ')}
          </span>
          <span className="text-relic-faint" aria-hidden="true">
            ·
          </span>
          <span>{guildLpCopy.openlock}</span>
        </p>

        <div className="mt-8 max-w-md">
          <GuildLpCta href={GUILD_WHATSAPP_URL}>{guildLpCopy.heroCta}</GuildLpCta>
          <p className="mt-3 text-sm leading-relaxed text-relic-muted">
            {guildLpCopy.heroSupport}
          </p>
        </div>
      </div>

      <a
        href="#prova"
        className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 cursor-pointer flex-col items-center gap-2 text-relic-muted transition-colors duration-200 hover:text-relic-gold sm:bottom-7"
        aria-label="Rolar para depoimentos"
      >
        <span className="font-cinzel text-[0.62rem] uppercase tracking-[0.32em]">
          Continuar
        </span>
        <span
          className="flex h-9 w-5 items-start justify-center rounded-full border border-white/15 p-1"
          aria-hidden="true"
        >
          <span className="guild-scroll-dot mt-0.5 h-1.5 w-1.5 rounded-full bg-relic-gold" />
        </span>
        <ChevronDown className="h-4 w-4 opacity-70" aria-hidden="true" />
      </a>
    </section>
  );
}
