import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/sections/Hero';
import Marquee from '@/components/sections/Marquee';
import PlansStack from '@/components/sections/PlansStack';
import Fidelidade from '@/components/sections/Fidelidade';
import Temas from '@/components/sections/Temas';
import FAQ from '@/components/sections/FAQ';
import LandingPageAnalytics from '@/components/analytics/LandingPageAnalytics';
import JsonLd from '@/components/seo/JsonLd';
import { displayName, getProfile } from '@/lib/dashboard/queries';
import { homePageMetadata } from '@/lib/seo/metadata';
import { buildHomeJsonLd } from '@/lib/seo/structured-data';
import { isStorePublic } from '@/lib/store/access';
import { createClient } from '@/lib/supabase/server';

export const metadata = homePageMetadata;

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfile(user.id) : null;
  const userName = user ? displayName(profile, user.email) : null;
  const isLoggedIn = !!user;
  const showStoreLink = isStorePublic() || profile?.is_admin === true;

  const jsonLd = buildHomeJsonLd();

  return (
    <>
      <JsonLd data={jsonLd} />
      <LandingPageAnalytics />
      <Navbar isLoggedIn={isLoggedIn} userName={userName} />
      <main id="conteudo-principal">
        <Hero isLoggedIn={isLoggedIn} userName={userName} />
        <Marquee />
        <PlansStack />
        <Fidelidade />
        <Temas />
        <FAQ />
      </main>
      <Footer isLoggedIn={isLoggedIn} showStoreLink={showStoreLink} />
    </>
  );
}
