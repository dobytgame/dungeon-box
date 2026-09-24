import HomeV2Button from '@/components/home-v2/HomeV2Button';
import HomeV2MediaFrame from '@/components/home-v2/HomeV2MediaFrame';
import HomeV2SectionHeading from '@/components/home-v2/HomeV2SectionHeading';
import { HOME_V2_COPY, type HomeV2MonthlyDungeon } from '@/lib/home-v2/content';

interface Props {
  dungeon: HomeV2MonthlyDungeon;
}

export default function HomeV2MonthlyDungeon({ dungeon }: Props) {
  const { monthly } = HOME_V2_COPY;
  const revealed = dungeon.status === 'revealed';

  return (
    <section
      id="dungeon-do-mes"
      className="relative overflow-hidden bg-mesa-ink px-4 py-20 sm:px-6 md:py-28"
      aria-labelledby="home-v2-monthly-title"
    >
      <div className="mx-auto grid max-w-6xl gap-14 md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] md:items-center md:gap-20">
        <div className="max-w-2xl">
          <HomeV2SectionHeading
            eyebrow={monthly.eyebrow}
            title={monthly.title}
            titleId="home-v2-monthly-title"
          />

          <div className="home-v2-reveal mt-10 border-l-2 border-mesa-jade/40 pl-5">
            <p
              className={`home-v2-display inline-flex items-center gap-2 text-[11px] tracking-[0.2em] ${
                revealed ? 'text-mesa-jade' : 'text-mesa-ash'
              }`}
            >
              <span
                aria-hidden="true"
                className={`size-1.5 rounded-full ${revealed ? 'bg-mesa-jade' : 'bg-mesa-ash'}`}
              />
              {revealed ? 'Tema revelado' : 'Em breve'}
            </p>
            <p className="home-v2-display mt-2 text-2xl text-mesa-parchment md:text-3xl">
              {dungeon.title}
            </p>
            <p className="mt-3 max-w-xl text-pretty text-base leading-relaxed text-mesa-ash">
              {dungeon.lore}
            </p>
          </div>

          <ul className="home-v2-reveal mt-7 grid gap-3 sm:grid-cols-3" style={{ '--stagger': 1 } as React.CSSProperties}>
            {dungeon.highlights.slice(0, 3).map((item, index) => (
              <li
                key={item}
                className="rounded-xl border border-white/10 bg-mesa-stone/60 p-4 text-sm leading-snug text-mesa-parchment"
              >
                <span className="home-v2-display block text-xs tracking-[0.16em] text-mesa-jade">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="mt-2 block">{item}</span>
              </li>
            ))}
          </ul>

          <div className="home-v2-reveal mt-9">
            <HomeV2Button href="#planos" arrow className="w-full sm:w-auto">
              {monthly.cta}
            </HomeV2Button>
          </div>
        </div>

        <div className="home-v2-reveal" style={{ '--stagger': 1 } as React.CSSProperties}>
          {dungeon.heroMedia ? (
            <div className="group relative mx-auto w-full max-w-md md:rotate-2 transition-transform duration-300 ease-out md:hover:rotate-0 md:translate-y-6">
              <div className="absolute -inset-4 -z-10 rounded-[2.5rem] border border-mesa-jade/15" aria-hidden="true" />
              <div className="absolute -inset-10 -z-20 rounded-full bg-mesa-jade/[0.06] blur-3xl" aria-hidden="true" />
              <HomeV2MediaFrame
                src={dungeon.heroMedia.src}
                alt={dungeon.heroMedia.alt}
                sizes="(min-width: 768px) 40vw, 100vw"
                className="rounded-3xl border border-white/10 shadow-2xl shadow-black/40"
              />
            </div>
          ) : (
            <div className="group relative mx-auto flex aspect-[16/10] w-full max-w-md md:rotate-2 flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-mesa-stone p-6 sm:aspect-[5/4] sm:p-8 shadow-2xl shadow-black/30 transition-transform duration-300 ease-out md:hover:rotate-0 md:translate-y-6">
              <div className="home-v2-grid absolute inset-0 opacity-70" aria-hidden="true" />
              <div
                className="absolute -right-12 -top-12 size-44 rounded-full border border-mesa-jade/15"
                aria-hidden="true"
              />
              <div className="relative max-w-xs">
                <p className="home-v2-display text-sm tracking-[0.2em] text-mesa-jade">Em breve</p>
                <p className="mt-4 text-lg text-mesa-parchment">
                  A próxima caixa será revelada pela operação.
                </p>
              </div>
              <div className="relative flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-mesa-ash">
                <span className="rounded-full border border-white/10 bg-mesa-ink/60 px-3 py-1.5">OpenLOCK</span>
                <span className="rounded-full border border-white/10 bg-mesa-ink/60 px-3 py-1.5">Mês a mês</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
