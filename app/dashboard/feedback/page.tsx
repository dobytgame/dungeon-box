import DashboardCard from '@/components/dashboard/DashboardCard';
import EmptyState from '@/components/dashboard/EmptyState';
import FeedbackForm from '@/components/dashboard/FeedbackForm';
import { formatDate } from '@/lib/dashboard/format';
import { requireDashboardUser } from '@/lib/dashboard/queries';
import { getFeedbackCyclesForUser } from '@/lib/feedback/queries';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata = privatePageMetadata('Avaliar entrega');

interface Props {
  searchParams: Promise<{ cycle?: string }>;
}

export default async function FeedbackPage({ searchParams }: Props) {
  const { user, supabase } = await requireDashboardUser();
  const params = await searchParams;
  const cycles = await getFeedbackCyclesForUser(supabase, user.id);
  const pendingCycles = cycles.filter((cycle) => !cycle.hasFeedback);
  const reviewedCycles = cycles.filter((cycle) => cycle.hasFeedback);

  return (
    <div className="space-y-8 md:space-y-10">
      {cycles.length === 0 ? (
        <EmptyState
          title="Nenhuma entrega para avaliar"
          description="Quando seu primeiro ciclo for entregue, você poderá deixar uma nota com estrelas e fotos da sua mesa."
          ctaLabel="Ver entregas"
          ctaHref="/dashboard/deliveries"
        />
      ) : (
        <>
          {pendingCycles.length > 0 ? (
            <FeedbackForm
              cycles={cycles}
              initialCycleId={params.cycle ?? null}
            />
          ) : (
            <EmptyState
              title="Tudo avaliado"
              description="Você já enviou feedback para todas as entregas disponíveis. Obrigado por ajudar a melhorar a DungeonBox!"
              ctaLabel="Ver entregas"
              ctaHref="/dashboard/deliveries"
            />
          )}

          {reviewedCycles.length > 0 ? (
            <DashboardCard title="Avaliações enviadas" accent="frost">
              <ul className="divide-y divide-white/5">
                {reviewedCycles.map((cycle) => (
                  <li key={cycle.id} className="py-3 text-sm text-stone-300">
                    Ciclo #{cycle.cycleNumber}
                    {cycle.themeName
                      ? ` — ${cycle.themeEmoji ?? ''} ${cycle.themeName}`
                      : ''}
                    {cycle.deliveredAt ? (
                      <span className="text-stone-500">
                        {' '}
                        · entregue em {formatDate(cycle.deliveredAt)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </DashboardCard>
          ) : null}
        </>
      )}
    </div>
  );
}
