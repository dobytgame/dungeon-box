import type { Metadata } from 'next';
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

export const metadata: Metadata = {
  title: 'DungeonBox — Seja um Fundador | Acesso Antecipado',
  description:
    'Entre na lista de espera da DungeonBox antes do lançamento oficial. Cenários 3D modulares para RPG, todo mês na sua porta. D&D, Tormenta, Pathfinder e mais.',
  openGraph: {
    title: 'DungeonBox — Acesso Antecipado para Fundadores',
    description:
      'A primeira assinatura mensal de cenários 3D modulares do Brasil. Vagas limitadas de fundador. Entre antes do lançamento.',
    images: ['/images/img-hero-dungeonbox.png'],
    type: 'website',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DungeonBox — Acesso Antecipado para Fundadores',
    description:
      'Cenários 3D modulares para RPG. Entre na Guilda antes do lançamento oficial.',
    images: ['/images/img-hero-dungeonbox.png'],
  },
};

export default async function Home() {
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
      <main>
        <LaunchHero />
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
