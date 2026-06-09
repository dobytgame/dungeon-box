import AnimatedSection from '@/components/ui/AnimatedSection';
import CTAButton from '@/components/ui/CTAButton';
import { WHATSAPP_GUILD_URL } from '@/lib/launch/constants';

export default function LaunchFinalCTA() {
  return (
    <section
      className="relative overflow-hidden bg-stone-950 px-6 py-24 md:py-32"
      aria-labelledby="final-cta-title"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(232,93,44,0.12)_0%,_transparent_65%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <AnimatedSection>
          <h2
            id="final-cta-title"
            className="font-display text-4xl uppercase leading-[0.95] tracking-wide text-white md:text-5xl lg:text-6xl"
          >
            A próxima sessão
            <br />
            <span className="text-gradient-ember">pode ser diferente.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-stone-400 md:text-lg">
            Não é sobre ter o cenário mais bonito. É sobre seus jogadores
            chegarem na mesa e sentirem que a aventura já começou antes de rolar
            o primeiro dado.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <CTAButton
              label="Entrar na Guilda — Grupo WhatsApp"
              size="lg"
              href={WHATSAPP_GUILD_URL}
              external
              className="w-full sm:w-auto"
            />
            <CTAButton
              label="Receber por e-mail"
              variant="default"
              size="lg"
              href="#captura"
              className="w-full sm:w-auto"
            />
          </div>
          <p className="mt-6 text-sm text-stone-500">
            Lançamento em breve · Vagas de fundador limitadas · Gratuito entrar
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
