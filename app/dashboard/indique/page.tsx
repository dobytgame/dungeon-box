import { redirect } from 'next/navigation';
import DashboardCard from '@/components/dashboard/DashboardCard';
import DataRow from '@/components/dashboard/DataRow';
import ReferralLinkCard from '@/components/referral/ReferralLinkCard';
import ReferralRedeemSection from '@/components/referral/ReferralRedeemSection';
import ReferralSubNav from '@/components/referral/ReferralSubNav';
import {
  getAddresses,
  getLatestSubscription,
  requireDashboardUser,
} from '@/lib/dashboard/queries';
import {
  REDEMPTION_STATUS_LABELS,
  REFERRAL_STATUS_LABELS,
} from '@/lib/referral/constants';
import { getReferralDashboardData } from '@/lib/referral/queries';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata = privatePageMetadata('Indique e Ganhe');

export default async function ReferralPage() {
  const { user, supabase } = await requireDashboardUser();
  const data = await getReferralDashboardData(supabase, user.id);

  if (!data.hasAccess) {
    redirect('/dashboard/subscription?referral=inactive');
  }

  const subscription = await getLatestSubscription(user.id);
  const addresses = await getAddresses(user.id);
  const defaultAddress =
    addresses.find((a) => a.id === subscription?.address_id) ??
    addresses.find((a) => a.is_default) ??
    addresses[0] ??
    null;

  return (
    <div className="space-y-8 md:space-y-10">
      <ReferralSubNav />
      <DashboardCard title="Seu link de indicação" accent="gold">
        <ReferralLinkCard code={data.code} link={data.link} />
      </DashboardCard>

      <DashboardCard title="Meus pontos" accent="frost">
        <dl>
          <DataRow label="Saldo disponível" value={`${data.balance} pts`} />
          {data.expiringSoon > 0 ? (
            <DataRow
              label="Expirando em 30 dias"
              value={`${data.expiringSoon} pts`}
            />
          ) : null}
        </dl>
        <p className="mt-4">
          <a
            href="/dashboard/indique/placar"
            className="font-display text-xs uppercase tracking-widest text-gold hover:text-gold/80"
          >
            Ver placar e evolução →
          </a>
        </p>
        {data.expiringSoon > 0 ? (
          <p className="mt-4 rounded-sm border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
            Você tem pontos que expiram em breve. Resgate uma recompensa antes
            que eles expirem.
          </p>
        ) : null}
      </DashboardCard>

      <DashboardCard
        title="Histórico de indicações"
        description="Indicações ficam pendentes até o indicado completar 30 dias de assinatura ativa."
      >
        {data.referrals.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nenhuma indicação registrada ainda. Compartilhe seu link para começar.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {data.referrals.map((referral) => (
              <li
                key={referral.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"
              >
                <div>
                  <p className="font-medium text-white">{referral.referredName}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {new Date(referral.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-stone-300">
                    {REFERRAL_STATUS_LABELS[referral.status] ?? referral.status}
                  </p>
                  {referral.pointsEarned ? (
                    <p className="mt-1 text-xs text-gold">
                      +{referral.pointsEarned} pts
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>

      <DashboardCard title="Resgatar recompensas">
        <ReferralRedeemSection balance={data.balance} defaultAddress={defaultAddress} />
      </DashboardCard>

      <DashboardCard title="Histórico de resgates">
        {data.redemptions.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum resgate solicitado ainda.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {data.redemptions.map((redemption) => (
              <li
                key={redemption.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"
              >
                <div>
                  <p className="font-medium text-white">{redemption.rewardLabel}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {new Date(redemption.createdAt).toLocaleDateString('pt-BR')} ·{' '}
                    {redemption.pointsSpent} pts
                  </p>
                </div>
                <p className="text-stone-300">
                  {REDEMPTION_STATUS_LABELS[redemption.status] ??
                    redemption.status}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>
    </div>
  );
}
