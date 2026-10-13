import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/sections/Hero';
import Marquee from '@/components/sections/Marquee';
import PlansStack from '@/components/sections/PlansStack';
import Depoimentos from '@/components/sections/Depoimentos';
import Fidelidade from '@/components/sections/Fidelidade';
import Temas from '@/components/sections/Temas';
import FAQ from '@/components/sections/FAQ';
import LandingPageAnalytics from '@/components/analytics/LandingPageAnalytics';
import { displayName, getProfile } from '@/lib/dashboard/queries';
import { buildRobots, homePageMetadata } from '@/lib/seo/metadata';
import { isStoreLinkVisible } from '@/lib/store/access';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

/** Cópia arquivada da home anterior ao go-live da LP2. Não indexar. */
export const metadata: Metadata = {
  ...homePageMetadata,
  title: { absolute: 'LP v1 (arquivo) | DungeonBox' },
  robots: buildRobots(false),
  alternates: { canonical: undefined },
};

export default async function LegacyHomeV1Page() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfile(user.id) : null;
  const userName = user ? displayName(profile, user.email) : null;
  const isLoggedIn = !!user;
  const showStoreLink = isStoreLinkVisible();

  return (
    <>
      <LandingPageAnalytics />
      <Navbar isLoggedIn={isLoggedIn} userName={userName} />
      <main id="conteudo-principal" className="overflow-x-clip">
        <Hero isLoggedIn={isLoggedIn} userName={userName} />
        <Marquee />
        <PlansStack />
        <Fidelidade />
        <Depoimentos />
        <Temas />
        <FAQ />
      </main>
      <Footer isLoggedIn={isLoggedIn} showStoreLink={showStoreLink} />
    </>
  );
}
