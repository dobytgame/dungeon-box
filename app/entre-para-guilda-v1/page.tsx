import LaunchCapture from '@/components/launch/LaunchCapture';
import LaunchFAQ from '@/components/launch/LaunchFAQ';
import LaunchFinalCTA from '@/components/launch/LaunchFinalCTA';
import LaunchHero from '@/components/launch/LaunchHero';
import LaunchMarquee from '@/components/launch/LaunchMarquee';
import LaunchPlans from '@/components/launch/LaunchPlans';
import LaunchProblem from '@/components/launch/LaunchProblem';
import LaunchSocialProof from '@/components/launch/LaunchSocialProof';
import LaunchSolution from '@/components/launch/LaunchSolution';
import LaunchFooter from '@/components/layout/LaunchFooter';
import LaunchNavbar from '@/components/layout/LaunchNavbar';
import { displayName, getProfile } from '@/lib/dashboard/queries';
import { getWaitlistCount } from '@/lib/launch/waitlist';
import { guildCampaignLegacyPageMetadata } from '@/lib/seo/metadata';
import { createClient } from '@/lib/supabase/server';

export const metadata = guildCampaignLegacyPageMetadata;

export default async function GuildCampaignLegacyPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfile(user.id) : null;
  const userName = user ? displayName(profile, user.email) : null;
  const isLoggedIn = !!user;
  const waitlistCount = await getWaitlistCount();

  return (
    <>
      <LaunchNavbar isLoggedIn={isLoggedIn} userName={userName} />
      <main id="conteudo-principal">
        <LaunchHero waitlistCount={waitlistCount} />
        <LaunchMarquee />
        <LaunchProblem />
        <LaunchSolution />
        <LaunchPlans />
        <LaunchSocialProof waitlistCount={waitlistCount} />
        <LaunchCapture />
        <LaunchFAQ />
        <LaunchFinalCTA />
      </main>
      <LaunchFooter isLoggedIn={isLoggedIn} />
    </>
  );
}
