import AnimatedSection from '@/components/ui/AnimatedSection';

const blocks = [
  'A mesa está montada. Os dados estão prontos. Mas o cenário é um mapa de papel amassado, duas caixas de papelão fazendo de parede e um punhado de improviso.',
  'Você imaginou a dungeon perfeita. O que chegou na mesa não tem nem metade da atmosfera.',
  'Seus jogadores merecem mais. Sua campanha merece mais. Você sabe disso.',
];

export default function LaunchProblem() {
  return (
    <section
      id="problema"
      className="relative overflow-hidden bg-stone-950 px-6 py-24 noise md:py-32"
      aria-labelledby="problema-title"
    >
      <div className="mx-auto max-w-3xl">
        <AnimatedSection>
          <p className="font-display text-xs uppercase tracking-[0.35em] text-ember">
            Identificação
          </p>
          <h2
            id="problema-title"
            className="mt-3 font-display text-4xl uppercase leading-[0.95] tracking-wide text-white md:text-5xl lg:text-6xl"
          >
            Você conhece
            <span className="text-gradient-ember"> essa cena.</span>
          </h2>
        </AnimatedSection>

        <div className="mt-12 space-y-8">
          {blocks.map((text, index) => (
            <AnimatedSection key={text} delay={index * 0.08}>
              <p className="border-l-2 border-white/10 pl-6 text-lg leading-relaxed text-stone-300 md:text-xl">
                {text}
              </p>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection delay={0.24}>
          <p className="mt-14 font-display text-2xl uppercase tracking-wide text-frost md:text-3xl">
            É exatamente isso que a DungeonBox resolve.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
