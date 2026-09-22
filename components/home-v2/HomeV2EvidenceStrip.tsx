import { Box, Link2, RefreshCw, Ruler } from 'lucide-react';
import { HOME_V2_COPY } from '@/lib/home-v2/content';

const EVIDENCE_ICONS = [Box, Link2, Ruler, RefreshCw] as const;

export default function HomeV2EvidenceStrip() {
  return (
    <section
      className="relative overflow-hidden border-y border-white/10 bg-mesa-stone"
      aria-labelledby="home-v2-evidence-title"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
        <div className="grid gap-6 border-b border-white/10 pb-10 md:grid-cols-[1.15fr_0.85fr] md:items-end md:gap-16">
          <div>
            <p className="home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade">
              {HOME_V2_COPY.evidenceSection.eyebrow}
            </p>
            <h2
              id="home-v2-evidence-title"
              className="home-v2-display mt-3 max-w-3xl text-balance text-[clamp(2.2rem,6vw,4.75rem)] leading-[0.9] text-mesa-parchment"
            >
              {HOME_V2_COPY.evidenceSection.title}
            </h2>
          </div>
          <p className="max-w-md text-pretty text-base leading-relaxed text-mesa-ash md:pb-1">
            {HOME_V2_COPY.evidenceSection.support}
          </p>
        </div>

        <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2 md:grid-cols-4 md:gap-0">
          {HOME_V2_COPY.evidence.map((item, index) => {
            const Icon = EVIDENCE_ICONS[index];
            return (
            <li
              key={item.label}
              className="group relative border-b border-white/10 py-7 last:border-b-0 md:border-b-0 md:border-l md:px-6 md:first:border-l-0 md:first:pl-0"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="home-v2-display text-5xl leading-none text-white/10 transition-colors duration-150 group-hover:text-mesa-ember/40">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Icon
                  aria-hidden="true"
                  className="mt-1 size-6 text-mesa-jade transition-transform duration-150 group-hover:rotate-[-8deg]"
                  strokeWidth={1.5}
                />
              </div>
              <p className="home-v2-display mt-8 text-sm tracking-[0.16em] text-mesa-parchment">
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
