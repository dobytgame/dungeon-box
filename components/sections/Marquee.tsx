import { Hexagon } from 'lucide-react';
import { marqueeItems } from '@/lib/data';

export default function Marquee() {
  const items = [...marqueeItems, ...marqueeItems];

  return (
    <section
      className="overflow-hidden border-y border-ember/30 bg-ember py-4"
      aria-label="Destaques do produto"
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
