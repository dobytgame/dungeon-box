import LaunchNavbar from '@/components/layout/LaunchNavbar';
import LaunchFooter from '@/components/layout/LaunchFooter';
import LaunchHero from '@/components/launch/LaunchHero';
import LaunchMarquee from '@/components/launch/LaunchMarquee';
import LaunchProblem from '@/components/launch/LaunchProblem';
import LaunchSolution from '@/components/launch/LaunchSolution';
import LaunchPlans from '@/components/launch/LaunchPlans';
import LaunchSocialProof from '@/components/launch/LaunchSocialProof';
import LaunchCapture from '@/components/launch/LaunchCapture';
import LaunchFAQ from '@/components/launch/LaunchFAQ';
import LaunchFinalCTA from '@/components/launch/LaunchFinalCTA';
import { displayName, getProfile } from '@/lib/dashboard/queries';
import { getWaitlistCount } from '@/lib/launch/waitlist';
import { createClient } from '@/lib/supabase/server';
import JsonLd from '@/components/seo/JsonLd';
import { homePageMetadata } from '@/lib/seo/metadata';
import { buildHomeJsonLd } from '@/lib/seo/structured-data';

export const metadata = homePageMetadata;

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfile(user.id) : null;
  const userName = user ? displayName(profile, user.email) : null;
  const isLoggedIn = !!user;
  const waitlistCount = await getWaitlistCount();

  const jsonLd = buildHomeJsonLd();

  return (
    <>
      <JsonLd data={jsonLd} />
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
