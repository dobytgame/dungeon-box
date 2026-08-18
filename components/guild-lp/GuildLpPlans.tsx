import GuildLpMark from '@/components/guild-lp/GuildLpMark';
import { guildLpCopy } from '@/lib/guild-lp/copy';

function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR');
}

export default function GuildLpPlans() {
  return (
    <section
      id="planos"
      className="scroll-mt-24 border-t border-white/[0.06] bg-relic-surface px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      aria-labelledby="planos-title"
    >
      <div className="mx-auto max-w-[1200px]">
        <p className="flex items-center gap-2 font-cinzel text-[11px] font-semibold uppercase tracking-[0.28em] text-relic-gold">
          <GuildLpMark className="h-2.5 w-2.5" />
          {guildLpCopy.plansEyebrow}
        </p>
        <h2
          id="planos-title"
          className="mt-4 font-cinzel text-[clamp(1.75rem,4vw,2.75rem)] font-bold uppercase leading-[0.95] tracking-wide text-relic-parchment"
        >
          {guildLpCopy.plansHeadline}
        </h2>
        <p className="mt-3 max-w-xl text-base leading-[1.7] text-relic-muted sm:text-lg">
          {guildLpCopy.plansSub}
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {guildLpCopy.plans.map((plan) => (
            <article
              key={plan.id}
              className={`rounded-lg border p-6 ${
                plan.featured
                  ? 'border-relic-gold/55 bg-relic-raised'
                  : 'border-white/[0.08] bg-relic-ink/60'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-cinzel text-xl font-semibold uppercase tracking-wide text-relic-parchment">
                  {plan.name}
                </h3>
                {plan.featured ? (
                  <span className="rounded-full border border-relic-gold/30 bg-relic-gold/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-relic-gold">
                    {plan.badge}
                  </span>
                ) : null}
              </div>
              <p className="mt-5 font-cinzel text-4xl font-bold tracking-tight text-relic-gold">
                R$ {formatPrice(plan.price)}
                <span className="ml-1 text-base font-semibold text-relic-muted">
                  /mês
                </span>
              </p>
              <p className="mt-4 text-base leading-relaxed text-relic-parchment/90">
                {plan.tagline}
              </p>
              <p className="mt-3 text-sm text-relic-muted">{plan.detail}</p>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-relic-muted">
          {guildLpCopy.plansNote}
        </p>
      </div>
    </section>
  );
}
