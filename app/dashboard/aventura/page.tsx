import DashboardCard from '@/components/dashboard/DashboardCard';
import EmptyState from '@/components/dashboard/EmptyState';
import UgcCampaignForm from '@/components/dashboard/UgcCampaignForm';
import { formatDate } from '@/lib/dashboard/format';
import {
  displayName,
  getProfile,
  requireDashboardUser,
} from '@/lib/dashboard/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadActiveStoreKitThemes } from '@/lib/store/kit-themes';
import { userCanAccessUgcCampaign } from '@/lib/ugc/access';
import { listUgcSubmissionsForUser } from '@/lib/ugc/queries';
import { userHasActiveSubscription } from '@/lib/theme-votes/queries';
import { privatePageMetadata } from '@/lib/seo/metadata';
import type { UgcContentStatus } from '@/lib/ugc/types';

export const metadata = privatePageMetadata('Mostre sua aventura');

const STATUS_LABEL: Record<UgcContentStatus, string> = {
  pending: 'Em análise',
  approved: 'Aprovado',
  rejected: 'Recusado',
};

export default async function UgcCampaignPage() {
  const { user } = await requireDashboardUser();
  const profile = await getProfile(user.id);
  const admin = createAdminClient();
  const [isActive, kitThemes, submissions] = await Promise.all([
    userHasActiveSubscription(admin, user.id),
    loadActiveStoreKitThemes(admin),
    listUgcSubmissionsForUser(admin, user.id),
  ]);

  const name = displayName(profile, user.email);
  const email = profile?.email ?? user.email ?? '';
  const canAccess = userCanAccessUgcCampaign(profile?.is_admin === true, isActive);

  return (
    <div className="space-y-8 md:space-y-10">
      {!canAccess ? (
        <EmptyState
          title="Campanha para assinantes"
          description="Mostre sua Aventura é para quem tem assinatura ativa. Com o plano em dia, você envia fotos da mesa e concorre a um brinde no próximo kit."
          ctaLabel="Ver assinatura"
          ctaHref="/dashboard/subscription"
        />
      ) : kitThemes.length === 0 ? (
        <EmptyState
          title="Campanha em preparação"
          description="Os kits da campanha ainda estão sendo configurados. Volte em breve para enviar sua mesa."
        />
      ) : (
        <UgcCampaignForm displayName={name} email={email} kitThemes={kitThemes} />
      )}

      {submissions.length > 0 ? (
        <DashboardCard title="Envios anteriores" accent="jade">
          <ul className="divide-y divide-white/5">
            {submissions.map((item) => (
              <li key={item.id} className="py-3 text-sm text-stone-300">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-stone-200">
                    {STATUS_LABEL[item.contentStatus]}
                  </span>
                  <span className="text-xs text-stone-500">
                    {formatDate(item.createdAt)} · {item.mediaCount} arquivo
                    {item.mediaCount === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-stone-500">{item.context}</p>
                {item.contentStatus === 'approved' && item.rewardStatus === 'queued' ? (
                  <p className="mt-1 text-xs text-gold">Brinde marcado no próximo kit.</p>
                ) : null}
                {item.rewardStatus === 'sent' ? (
                  <p className="mt-1 text-xs text-gold">Brinde incluído no kit.</p>
                ) : null}
              </li>
            ))}
          </ul>
        </DashboardCard>
      ) : null}
    </div>
  );
}
