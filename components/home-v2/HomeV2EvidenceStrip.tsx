import { Box, Link2, RefreshCw, Ruler } from 'lucide-react';
import { HOME_V2_COPY } from '@/lib/home-v2/content';

const EVIDENCE_ICONS = [Box, Link2, Ruler, RefreshCw] as const;

export default function HomeV2EvidenceStrip() {
  const { evidenceSection, evidence } = HOME_V2_COPY;

  return (
    <section
      className="relative overflow-hidden border-y border-white/10 bg-mesa-stone"
      aria-labelledby="home-v2-evidence-title"
    >
      <div className="home-v2-grid home-v2-fog pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="grid gap-6 pb-12 md:grid-cols-[1.15fr_0.85fr] md:items-end md:gap-16">
          <div>
            <p className="home-v2-reveal home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade">
              {evidenceSection.eyebrow}
            </p>
            <h2
              id="home-v2-evidence-title"
              data-reveal="mask"
              className="home-v2-reveal home-v2-display mt-3 max-w-3xl text-balance text-[clamp(2.2rem,6vw,4.75rem)] leading-[0.9] text-mesa-parchment"
              style={{ '--stagger': 1 } as React.CSSProperties}
            >
              {evidenceSection.title}
            </h2>
          </div>
          <p
            className="home-v2-reveal max-w-md text-pretty text-base leading-relaxed text-mesa-ash md:pb-1"
            style={{ '--stagger': 2 } as React.CSSProperties}
          >
            {evidenceSection.support}
          </p>
        </div>

        <div className="home-v2-hairline h-px" aria-hidden="true" />

        <ul className="grid grid-cols-2 md:grid-cols-4">
          {evidence.map((item, index) => {
            const Icon = EVIDENCE_ICONS[index];
            return (
              <li
                key={item.label}
                className="home-v2-reveal group relative border-white/10 py-8 pr-4 max-md:[&:nth-child(-n+2)]:border-b max-md:even:border-l max-md:even:pl-4 md:border-l md:px-6 md:first:border-l-0 md:first:pl-0"
                style={{ '--stagger': index } as React.CSSProperties}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="home-v2-display text-5xl leading-none text-white/10 transition-colors duration-200 group-hover:text-mesa-jade/40">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="flex size-10 items-center justify-center rounded-full border border-mesa-jade/20 bg-mesa-jade/[0.06] transition-colors duration-200 group-hover:border-mesa-jade/50">
                    <Icon aria-hidden="true" className="size-[18px] text-mesa-jade" strokeWidth={1.75} />
                  </span>
                </div>
                <p className="home-v2-display mt-7 text-sm tracking-[0.16em] text-mesa-parchment">
                  {item.label}
                </p>
                <p className="mt-2 max-w-[15rem] text-sm leading-relaxed text-mesa-ash">
                  {item.detail}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
