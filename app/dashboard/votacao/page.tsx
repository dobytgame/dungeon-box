import { redirect } from 'next/navigation';
import EmptyState from '@/components/dashboard/EmptyState';
import ThemeVoteArena from '@/components/dashboard/ThemeVoteArena';
import ThemeVoteResult from '@/components/dashboard/ThemeVoteResult';
import { checkoutHref } from '@/lib/checkout/plans';
import { getProfile, requireDashboardUser } from '@/lib/dashboard/queries';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  userCanCastThemeVote,
  userCanSeeThemeVote,
} from '@/lib/theme-votes/access';
import {
  getUserVoteOptionId,
  listThemePollsWithTallies,
  pickFeaturedThemePoll,
  userHasActiveSubscription,
} from '@/lib/theme-votes/queries';
import { toSubscriberThemePollView } from '@/lib/theme-votes/view';

export const metadata = privatePageMetadata('Votação de tema');

export default async function ThemeVotePage() {
  const { user } = await requireDashboardUser();
  const profile = await getProfile(user.id);
  const isAdmin = profile?.is_admin === true;

  if (!userCanSeeThemeVote(isAdmin)) {
    redirect('/dashboard');
  }

  const admin = createAdminClient();
  const [isActiveSubscriber, polls] = await Promise.all([
    userHasActiveSubscription(admin, user.id),
    listThemePollsWithTallies(admin),
  ]);
  const canVote = userCanCastThemeVote(isAdmin, isActiveSubscriber);

  const featured = pickFeaturedThemePoll(polls);

  const userVoteOptionId = featured
    ? await getUserVoteOptionId(admin, user.id, featured.id)
    : null;

  const view = featured
    ? toSubscriberThemePollView(featured, userVoteOptionId, canVote)
    : null;

  if (!view) {
    return (
      <EmptyState
        title="Nenhuma votação no momento"
        description="Quando o próximo ciclo abrir votação, os dois temas aparecem aqui para você escolher."
        ctaLabel="Ver entregas"
        ctaHref="/dashboard/deliveries"
      />
    );
  }

  if (view.status === 'ended') {
    return <ThemeVoteResult poll={view} variant="full" />;
  }

  if (!canVote && !isAdmin) {
    return (
      <EmptyState
        title="Votação para assinantes"
        description="A escolha do tema do ciclo é exclusiva para quem tem assinatura ativa."
        ctaLabel="Assinar agora"
        ctaHref={checkoutHref('heroi')}
      />
    );
  }

  return <ThemeVoteArena poll={view} />;
}
