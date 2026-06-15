import AnimatedSection from '@/components/ui/AnimatedSection';
import LaunchCTAActions from '@/components/launch/LaunchCTAActions';
import { launchCopy } from '@/lib/launch/constants';

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
            Seus jogadores merecem
            <br />
            <span className="text-gradient-ember">
              uma dungeon à altura da história que você criou.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-stone-400 md:text-lg">
            Cada mês, um novo kit. Cada kit, uma nova ala da dungeon. Sua
            campanha cresce — e a mesa vira o cenário que você sempre imaginou.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <LaunchCTAActions align="center" className="mt-10" />
          <p className="mt-6 text-sm text-stone-500">
            Lançamento em breve · {launchCopy.founderUrgencyShort}
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
