import Link from 'next/link';
import { redirect } from 'next/navigation';
import PaintKitAddon from '@/components/dashboard/PaintKitAddon';
import DashboardCard from '@/components/dashboard/DashboardCard';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { relOne } from '@/lib/dashboard/format';
import {
  getManageableSubscriptions,
  requireDashboardUser,
} from '@/lib/dashboard/queries';
import { subscriptionEligibleForPaintKitAddon } from '@/lib/subscriptions/paint-kit-addon';

interface Props {
  searchParams: Promise<{ subscription?: string }>;
}

export default async function PaintKitAddonPage({ searchParams }: Props) {
  const { subscription: subscriptionId } = await searchParams;
  const { user } = await requireDashboardUser();
  const subscriptions = await getManageableSubscriptions(user.id);
  const eligible = subscriptions.filter(subscriptionEligibleForPaintKitAddon);

  if (eligible.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <DashboardCard title="Kit de pintura" accent="gold">
          <p className="text-sm text-stone-400">
            Nenhuma assinatura ativa disponível para adicionar kit de pintura. Se você
            acabou de assinar, aguarde a confirmação do pagamento ou acesse{' '}
            <Link href="/dashboard/subscription" className="text-ember hover:underline">
              Minha assinatura
            </Link>
            .
          </p>
        </DashboardCard>
      </div>
    );
  }

  const selected =
    eligible.find((sub) => sub.id === subscriptionId) ?? eligible[0]!;

  if (subscriptionId && selected.id !== subscriptionId) {
    redirect(`/dashboard/addons/paint-kit?subscription=${selected.id}`);
  }

  const plan = relOne(selected.plans);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="font-display text-xs uppercase tracking-[0.3em] text-gold">
          Adicional
        </p>
        <h1 className="mt-2 font-display text-3xl uppercase tracking-wide text-white">
          Kit de pintura
        </h1>
        <p className="mt-3 text-sm text-stone-400">
          Plano{' '}
          <span className="text-white">{plan?.name ?? '—'}</span>{' '}
          <StatusBadge kind="subscription" status={selected.status} />
        </p>
      </div>

      {eligible.length > 1 ? (
        <DashboardCard title="Escolha a assinatura" accent="none">
          <div className="flex flex-wrap gap-2">
            {eligible.map((sub) => {
              const subPlan = relOne(sub.plans);
              const active = sub.id === selected.id;
              return (
                <Link
                  key={sub.id}
                  href={`/dashboard/addons/paint-kit?subscription=${sub.id}`}
                  className={`rounded-sm border px-3 py-2 text-sm transition ${
                    active
                      ? 'border-gold/40 bg-gold/10 text-white'
                      : 'border-white/10 text-stone-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {subPlan?.name ?? 'Plano'}
                </Link>
              );
            })}
          </div>
        </DashboardCard>
      ) : null}

      <PaintKitAddon subscription={selected} />

      <p className="text-center text-sm text-stone-500">
        <Link href="/dashboard/subscription" className="text-ember hover:underline">
          ← Voltar para assinatura
        </Link>
      </p>
    </div>
  );
}
