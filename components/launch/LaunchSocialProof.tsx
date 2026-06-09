import { Users } from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { launchTestimonials } from '@/lib/launch/data';

interface Props {
  waitlistCount: number;
}

export default function LaunchSocialProof({ waitlistCount }: Props) {
  const displayCount = waitlistCount > 0 ? waitlistCount : null;

  return (
    <section
      className="relative overflow-hidden bg-stone-950 bg-grid px-6 py-24 noise md:py-32"
      aria-labelledby="social-title"
    >
      <div className="mx-auto max-w-6xl">
        <AnimatedSection>
          <div className="text-center">
            <p className="font-display text-xs uppercase tracking-[0.35em] text-ember">
              Prova social
            </p>
            <h2
              id="social-title"
              className="mt-3 font-display text-4xl uppercase leading-[0.95] tracking-wide text-white md:text-5xl"
            >
              Os primeiros mestres
              <br />
              <span className="text-gradient-ember">já estão na Guilda.</span>
            </h2>

            <div className="mx-auto mt-8 inline-flex items-center gap-3 rounded-sm border border-frost/25 bg-frost/5 px-5 py-3">
              <Users className="h-5 w-5 text-frost" aria-hidden="true" />
              <p className="font-display text-lg uppercase tracking-wide text-white md:text-xl">
                {displayCount !== null ? (
                  <>
                    <span className="text-gradient-frost">{displayCount}</span>{' '}
                    {displayCount === 1 ? 'pessoa' : 'pessoas'} na lista de
                    espera
                  </>
                ) : (
                  'Mestres entrando na lista de espera'
                )}
              </p>
            </div>
          </div>
        </AnimatedSection>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {launchTestimonials.map((item, index) => (
            <AnimatedSection key={item.author} delay={index * 0.1}>
              <blockquote className="flex h-full flex-col rounded-sm border border-white/[0.08] bg-stone-900/50 p-6">
                <p className="flex-1 text-sm leading-relaxed text-stone-300 md:text-base">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <footer className="mt-5 border-t border-white/[0.06] pt-4">
                  <cite className="not-italic">
                    <span className="block font-display text-sm uppercase tracking-wide text-white">
                      {item.author}
                    </span>
                    <span className="mt-1 block text-xs text-stone-500">
                      {item.role}
                    </span>
                  </cite>
                </footer>
              </blockquote>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection delay={0.2}>
          <p className="mt-8 text-center text-xs text-stone-600">
            * Depoimentos de jogadores da lista de espera durante o período de
            desenvolvimento.
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
