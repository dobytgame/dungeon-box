import { MessageCircle, ScrollText } from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import CTAButton from '@/components/ui/CTAButton';
import NewsletterForm from '@/components/launch/NewsletterForm';
import { WHATSAPP_GUILD_URL } from '@/lib/launch/constants';

const whatsappPerks = [
  'Previews exclusivos saindo da impressora',
  'Votação no tema do Mês 1',
  'Desconto de fundador antes do lançamento',
  'Link de assinatura chega aqui primeiro',
];

const newsletterPerks = [
  'Revelação dos planos e preços',
  'Fotos e vídeos dos kits antes do lançamento',
  'Oferta de fundador exclusiva',
  'Calendário completo dos 12 temas mensais',
];

export default function LaunchCapture() {
  return (
    <section
      id="captura"
      className="relative overflow-hidden bg-stone-950 px-6 py-24 noise md:py-32"
      aria-labelledby="captura-title"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ember/5 via-transparent to-frost/5"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl">
        <AnimatedSection>
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-display text-xs uppercase tracking-[0.35em] text-ember">
              Acesso antecipado
            </p>
            <h2
              id="captura-title"
              className="mt-3 font-display text-4xl uppercase leading-[0.95] tracking-wide text-white md:text-5xl lg:text-6xl"
            >
              Entre antes de
              <span className="text-gradient-ember"> todo mundo.</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-stone-400 md:text-lg">
              Dois caminhos. Mesmo destino — acesso antecipado antes do
              lançamento oficial.
            </p>
          </div>
        </AnimatedSection>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <AnimatedSection delay={0.05}>
            <article className="flex h-full flex-col rounded-sm border border-ember/25 bg-stone-900/60 p-6 md:p-8">
              <div className="mb-5 inline-flex rounded-sm border border-ember/30 bg-ember/10 p-3 text-ember">
                <MessageCircle className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="font-display text-2xl uppercase tracking-wide text-white">
                Grupo da Guilda
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-stone-400">
                Para quem quer acompanhar de perto, ver os bastidores da
                produção ao vivo e garantir o desconto de fundador.
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {whatsappPerks.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-start gap-2 text-sm text-stone-300"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
                    {perk}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <CTAButton
                  label="Entrar no Grupo da Guilda"
                  size="lg"
                  href={WHATSAPP_GUILD_URL}
                  external
                  className="w-full"
                />
              </div>
            </article>
          </AnimatedSection>

          <AnimatedSection delay={0.12}>
            <article className="flex h-full flex-col rounded-sm border border-frost/25 bg-stone-900/60 p-6 md:p-8">
              <div className="mb-5 inline-flex rounded-sm border border-frost/30 bg-frost/10 p-3 text-frost">
                <ScrollText className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="font-display text-2xl uppercase tracking-wide text-white">
                Crônica do Mestre
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-stone-400">
                Para quem prefere receber as novidades no e-mail, sem barulho de
                grupo.
              </p>
              <ul className="mt-6 space-y-3">
                {newsletterPerks.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-start gap-2 text-sm text-stone-300"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-frost" />
                    {perk}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <NewsletterForm
                  id="captura-newsletter-email"
                  source="launch_capture"
                />
              </div>
            </article>
          </AnimatedSection>
        </div>

        <AnimatedSection delay={0.2}>
          <p className="mt-10 text-center text-sm text-stone-500">
            Sem spam. Sem venda de dados. Cancele quando quiser.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
