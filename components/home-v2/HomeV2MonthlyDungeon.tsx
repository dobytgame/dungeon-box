import HomeV2Button from '@/components/home-v2/HomeV2Button';
import HomeV2MediaFrame from '@/components/home-v2/HomeV2MediaFrame';
import HomeV2SectionHeading from '@/components/home-v2/HomeV2SectionHeading';
import { HOME_V2_COPY, type HomeV2MonthlyDungeon } from '@/lib/home-v2/content';

interface Props {
  dungeon: HomeV2MonthlyDungeon;
}

export default function HomeV2MonthlyDungeon({ dungeon }: Props) {
  return (
    <section
      id="dungeon-do-mes"
      className="bg-mesa-ink px-4 py-16 sm:px-6 md:py-24"
      aria-labelledby="home-v2-monthly-title"
    >
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)] md:items-center md:gap-20">
        <div className="max-w-2xl">
          <HomeV2SectionHeading
            eyebrow={HOME_V2_COPY.monthly.eyebrow}
            title={HOME_V2_COPY.monthly.title}
            titleId="home-v2-monthly-title"
          />
          <p className="home-v2-display mt-8 text-2xl text-mesa-parchment md:text-3xl">
            {dungeon.title}
          </p>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-mesa-ash">
            {dungeon.lore}
          </p>
          <ul className="mt-6 space-y-2">
            {dungeon.highlights.slice(0, 3).map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-mesa-parchment">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-mesa-jade" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <HomeV2Button href="#planos" className="mt-8">
            {HOME_V2_COPY.monthly.cta}
          </HomeV2Button>
        </div>

        {dungeon.heroMedia ? (
          <div className="relative mx-auto w-full max-w-md rotate-2 md:translate-y-6">
            <div className="absolute -inset-4 -z-10 rounded-[2.5rem] border border-mesa-jade/10" aria-hidden="true" />
            <HomeV2MediaFrame
              src={dungeon.heroMedia.src}
              alt={dungeon.heroMedia.alt}
              sizes="(min-width: 768px) 40vw, 100vw"
              className="rounded-3xl border border-white/10 shadow-2xl shadow-black/30"
            />
          </div>
        ) : (
          <div className="relative mx-auto flex aspect-[5/4] w-full max-w-md rotate-2 flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-mesa-stone p-8 shadow-2xl shadow-black/20 md:translate-y-6">
            <div
              className="absolute -right-12 -top-12 size-44 rounded-full border border-mesa-jade/15"
              aria-hidden="true"
            />
            <div
              className="absolute right-12 top-16 h-px w-2/5 bg-white/10"
              aria-hidden="true"
            />
            <div className="relative max-w-xs">
              <p className="home-v2-display text-sm tracking-[0.2em] text-mesa-jade">
                Em breve
              </p>
              <p className="mt-4 text-lg text-mesa-parchment">
                A próxima caixa será revelada pela operação.
              </p>
            </div>
            <div className="relative flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] text-mesa-ash">
              <span className="rounded-full border border-white/10 px-3 py-1.5">OpenLOCK</span>
              <span className="rounded-full border border-white/10 px-3 py-1.5">Mês a mês</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
