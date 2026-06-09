import { Box, Castle, Link2 } from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { launchPillars } from '@/lib/launch/data';

const pillarIcons = {
  castle: Castle,
  link: Link2,
  box: Box,
} as const;

export default function LaunchSolution() {
  return (
    <section
      id="solucao"
      className="relative overflow-hidden bg-stone-950 bg-grid px-6 py-24 noise md:py-32"
      aria-labelledby="solucao-title"
    >
      <div className="mx-auto max-w-6xl">
        <AnimatedSection>
          <p className="font-display text-xs uppercase tracking-[0.35em] text-ember">
            A solução
          </p>
          <h2
            id="solucao-title"
            className="mt-3 max-w-2xl font-display text-4xl uppercase leading-[0.95] tracking-wide text-white md:text-5xl lg:text-6xl"
          >
            Cenários 3D modulares.
            <br />
            <span className="text-gradient-ember">
              Todo mês. Na sua porta.
            </span>
          </h2>
        </AnimatedSection>

        <div className="mt-14 grid gap-6 md:grid-cols-3 md:gap-8">
          {launchPillars.map((pillar, index) => {
            const Icon = pillarIcons[pillar.icon];
            return (
              <AnimatedSection key={pillar.title} delay={index * 0.1}>
                <article className="group h-full rounded-sm border border-white/[0.08] bg-stone-900/40 p-6 transition-colors duration-200 hover:border-ember/30 hover:bg-stone-900/60 md:p-8">
                  <div className="mb-5 inline-flex rounded-sm border border-ember/30 bg-ember/10 p-3 text-ember transition-colors group-hover:bg-ember/15">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-xl uppercase tracking-wide text-white">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-stone-400 md:text-base">
                    {pillar.description}
                  </p>
                </article>
              </AnimatedSection>
            );
          })}
        </div>

        <AnimatedSection delay={0.2}>
          <p className="mt-12 text-center text-sm uppercase tracking-[0.2em] text-stone-500 md:text-base">
            Compatível com D&D 5e · Tormenta RPG · Pathfinder · Old Dragon ·
            Qualquer sistema com grid 28mm
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
