import Link from 'next/link';
import { Camera } from 'lucide-react';
import { requireDashboardUser } from '@/lib/dashboard/queries';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata = privatePageMetadata('Mostre sua aventura');

export default async function UgcCampaignPage() {
  await requireDashboardUser();

  return (
    <section
      aria-labelledby="aventura-breve-title"
      className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-mesa-stone"
    >
      <div className="home-v2-grid home-v2-fog absolute inset-0 -z-10" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full bg-mesa-ember/[0.1] blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative px-5 py-10 sm:px-8 sm:py-14 md:px-10">
        <span className="home-v2-display inline-flex min-h-11 items-center rounded-full bg-mesa-ember px-3 py-1.5 text-[11px] tracking-[0.16em] text-mesa-ink">
          Em breve
        </span>

        <div className="mt-6 flex items-start gap-4">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-sm border border-white/10 bg-mesa-ink/60 text-mesa-jade"
            aria-hidden="true"
          >
            <Camera className="size-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade">
              Novidade da mesa
            </p>
            <h2
              id="aventura-breve-title"
              className="home-v2-display mt-2 text-[clamp(2rem,7vw,3.5rem)] leading-[0.92] tracking-wide text-mesa-parchment"
            >
              Mostre sua aventura
            </h2>
          </div>
        </div>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-pretty text-mesa-ash">
          O envio ainda está fechado. Estamos preparando a campanha para você
          mostrar a dungeon em jogo — sem formulário, sem fila, só o aviso por
          enquanto.
        </p>

        <aside className="mt-8 max-w-lg rounded-2xl border border-white/10 bg-mesa-ink/70 px-5 py-5">
          <p className="home-v2-display text-[11px] tracking-[0.22em] text-mesa-jade">
            Spoiler
          </p>
          <p className="mt-2 text-base leading-relaxed text-mesa-parchment">
            Quando abrir, entra foto ou vídeo da mesa. Se a equipe aprovar, um
            brinde viaja no próximo kit.
          </p>
        </aside>

        <Link
          href="/dashboard"
          className="mt-8 inline-flex min-h-11 cursor-pointer items-center text-sm text-mesa-ember transition-colors duration-200 hover:underline"
        >
          Voltar à visão geral
        </Link>
      </div>
    </section>
  );
}
