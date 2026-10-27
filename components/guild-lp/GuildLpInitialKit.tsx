import Image from 'next/image';
import GuildLpMark from '@/components/guild-lp/GuildLpMark';
import { guildLpCopy } from '@/lib/guild-lp/copy';
import { SUBSCRIPTION_PRODUCTION_NOTE } from '@/lib/production/lead-time';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  formatStoreKitThemeLabel,
  loadStoreKitThemes,
} from '@/lib/store/kit-themes';
import { resolveDefaultKitTheme } from '@/lib/subscriptions/cycle-kit-theme';

export default async function GuildLpInitialKit() {
  const admin = createAdminClient();
  const themes = await loadStoreKitThemes(admin);
  const initialKit = resolveDefaultKitTheme(themes);

  return (
    <section
      id="primeira-caixa"
      className="scroll-mt-24 border-t border-white/[0.06] bg-relic-ink px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      aria-labelledby="primeira-caixa-title"
    >
      <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-14">
        <div>
          <p className="flex items-center gap-2 font-cinzel text-[11px] font-semibold uppercase tracking-[0.28em] text-relic-gold">
            <GuildLpMark className="h-2.5 w-2.5" />
            {guildLpCopy.initialKitEyebrow}
          </p>
          <h2
            id="primeira-caixa-title"
            className="mt-4 font-cinzel text-[clamp(1.75rem,4vw,2.75rem)] font-bold uppercase leading-[0.95] tracking-wide text-relic-parchment"
          >
            {guildLpCopy.initialKitTitle}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-[1.7] text-relic-parchment/90 sm:text-lg">
            {initialKit
              ? guildLpCopy.initialKitBody(initialKit.name)
              : guildLpCopy.initialKitBodyFallback}
          </p>
          <ul className="mt-6 space-y-3 text-sm leading-relaxed text-relic-muted sm:text-base">
            <li>{guildLpCopy.initialKitPlanNote}</li>
            <li>{guildLpCopy.initialKitFinishNote}</li>
            <li>{SUBSCRIPTION_PRODUCTION_NOTE}</li>
            <li>{guildLpCopy.initialKitShippingNote}</li>
          </ul>
          <p className="mt-6 text-sm text-relic-muted">{guildLpCopy.initialKitSwapNote}</p>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-white/[0.08] bg-relic-surface">
          {initialKit?.imageUrl ? (
            <Image
              src={initialKit.imageUrl}
              alt={
                initialKit.name
                  ? `Kit inicial — ${initialKit.name}`
                  : 'Kit inicial da assinatura DungeonBox'
              }
              width={960}
              height={720}
              className="h-auto w-full object-cover"
              sizes="(min-width: 1024px) 480px, 100vw"
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center bg-relic-raised p-8 text-center text-sm text-relic-muted">
              {guildLpCopy.initialKitImageFallback}
            </div>
          )}
          {initialKit ? (
            <p className="border-t border-white/[0.06] px-5 py-4 font-cinzel text-sm uppercase tracking-wide text-relic-gold">
              {formatStoreKitThemeLabel(initialKit)}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
