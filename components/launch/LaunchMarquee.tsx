import { Hexagon } from 'lucide-react';

const launchMarqueeItems = [
  'Lançamento em breve',
  'Vagas de fundador',
  'Cenários 3D modulares',
  'Sistema OpenLOCK',
  'D&D · Tormenta · Pathfinder',
  'Escala 28mm',
  'Dungeon que cresce todo mês',
];

export default function LaunchMarquee() {
  const items = [...launchMarqueeItems, ...launchMarqueeItems];

  return (
    <section
      className="overflow-hidden border-y border-ember/30 bg-ember py-4"
      aria-label="Destaques do lançamento"
    >
      <div className="flex animate-marquee whitespace-nowrap">
        {items.map((text, i) => (
          <span
            key={`${text}-${i}`}
            className="mx-8 inline-flex items-center gap-3 font-display text-lg uppercase tracking-[0.3em] text-stone-950 md:text-xl"
          >
            <Hexagon className="h-4 w-4 fill-stone-950" aria-hidden="true" />
            {text}
          </span>
        ))}
      </div>
    </section>
  );
}
