import {
  BadgePercent,
  Eye,
  Link2,
  MessageCircle,
  Sparkles,
  Vote,
} from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import CTAButton from '@/components/ui/CTAButton';
import { WHATSAPP_GUILD_URL, launchCopy } from '@/lib/launch/constants';

const whatsappPerks = [
  {
    icon: Eye,
    label: 'Previews exclusivos saindo da impressora',
  },
  {
    icon: Vote,
    label: 'Votação no tema do Mês 1',
  },
  {
    icon: BadgePercent,
    label: 'Desconto de fundador antes do lançamento',
  },
  {
    icon: Link2,
    label: 'Link de assinatura chega aqui primeiro',
  },
] as const;

const trustChips = launchCopy.ctaSupport.split(' · ');

export default function LaunchCapture() {
  return (
    <section
      id="captura"
      className="relative overflow-hidden bg-stone-950 bg-grid px-4 py-24 noise sm:px-6 md:py-32"
      aria-labelledby="captura-title"
    >
      <div
        className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-ember/10 blur-[100px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-1/4 h-64 w-64 rounded-full bg-frost/10 blur-[90px]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-14 xl:gap-20">
          <AnimatedSection className="text-center lg:text-left">
            <p className="font-display text-xs uppercase tracking-[0.35em] text-ember">
              Acesso antecipado
            </p>
            <h2
              id="captura-title"
              className="mt-3 font-display text-4xl uppercase leading-[0.95] tracking-wide text-white md:text-5xl lg:text-[3.25rem] lg:leading-[0.92]"
            >
              Garanta seu acesso
              <span className="text-gradient-ember"> de fundador.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-stone-400 md:text-lg lg:mx-0">
              Depois que a DungeonBox abrir para o público, o preço de fundador
              não volta.
            </p>

            <div className="mx-auto mt-8 max-w-md rounded-sm border border-ember/20 bg-ember/[0.06] px-4 py-3 text-left lg:mx-0">
              <p className="flex items-start gap-2.5 text-sm leading-relaxed text-stone-300">
                <Sparkles
                  className="mt-0.5 h-4 w-4 shrink-0 text-ember"
                  aria-hidden="true"
                />
                <span>{launchCopy.founderUrgency}</span>
              </p>
            </div>

            <ul
              className="mt-8 flex flex-wrap justify-center gap-2 lg:justify-start"
              aria-label="Benefícios do grupo"
            >
              {trustChips.map((chip) => (
                <li
                  key={chip}
                  className="rounded-sm border border-white/10 bg-stone-900/60 px-3 py-1.5 text-xs text-stone-400"
                >
                  {chip}
                </li>
              ))}
            </ul>
          </AnimatedSection>

          <AnimatedSection delay={0.08} className="mt-14 lg:mt-0">
            <article className="hero-relic-frame relative mx-auto max-w-lg lg:max-w-none">
              <span
                className="hero-relic-corner left-0 top-0 border-l-2 border-t-2"
                aria-hidden="true"
              />
              <span
                className="hero-relic-corner right-0 top-0 border-r-2 border-t-2"
                aria-hidden="true"
              />
              <span
                className="hero-relic-corner bottom-0 left-0 border-b-2 border-l-2"
                aria-hidden="true"
              />
              <span
                className="hero-relic-corner bottom-0 right-0 border-b-2 border-r-2"
                aria-hidden="true"
              />

              <div className="relative overflow-hidden rounded-sm border border-white/[0.08] bg-stone-900/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm md:p-8">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ember/60 to-transparent"
                  aria-hidden="true"
                />

                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="inline-flex rounded-sm border border-ember/30 bg-ember/10 p-3 text-ember">
                    <MessageCircle className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <span className="rounded-sm border border-frost/25 bg-frost/5 px-2.5 py-1 font-display text-[0.62rem] uppercase tracking-[0.22em] text-frost">
                    WhatsApp · Gratuito
                  </span>
                </div>

                <h3 className="mt-5 font-display text-2xl uppercase tracking-wide text-white md:text-3xl">
                  Grupo da Guilda
                </h3>
                <p className="mt-3 max-w-prose text-sm leading-relaxed text-stone-400 md:text-base">
                  Bastidores da produção, votação de temas e o link de assinatura
                  antes de todo mundo — direto no seu celular.
                </p>

                <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                  {whatsappPerks.map(({ icon: Icon, label }) => (
                    <li
                      key={label}
                      className="flex items-start gap-3 rounded-sm border border-white/[0.06] bg-stone-950/40 px-3 py-3"
                    >
                      <span className="mt-0.5 inline-flex rounded-sm border border-ember/20 bg-ember/10 p-1.5 text-ember">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="text-sm leading-snug text-stone-300">
                        {label}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 border-t border-white/[0.06] pt-6">
                  <CTAButton
                    label="Entrar no Grupo da Guilda"
                    size="lg"
                    href={WHATSAPP_GUILD_URL}
                    external
                    className="w-full border-glow-ember shadow-[0_8px_32px_rgba(255,107,43,0.22)]"
                  />
                  <p className="mt-3 text-center text-xs text-stone-500">
                    Abre no WhatsApp · Sem compromisso · Saia quando quiser
                  </p>
                </div>
              </div>
            </article>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
