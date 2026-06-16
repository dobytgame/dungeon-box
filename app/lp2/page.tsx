import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/sections/Hero';
import Marquee from '@/components/sections/Marquee';
import PlansStack from '@/components/sections/PlansStack';
import Fidelidade from '@/components/sections/Fidelidade';
import Temas from '@/components/sections/Temas';
import FAQ from '@/components/sections/FAQ';
import JsonLd from '@/components/seo/JsonLd';
import { displayName, getProfile } from '@/lib/dashboard/queries';
import { salesPageMetadata } from '@/lib/seo/metadata';
import { buildSalesPageJsonLd } from '@/lib/seo/structured-data';
import { createClient } from '@/lib/supabase/server';

export const metadata = salesPageMetadata;

export default async function SalesLandingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfile(user.id) : null;
  const userName = user ? displayName(profile, user.email) : null;
  const isLoggedIn = !!user;

  const jsonLd = buildSalesPageJsonLd();

  return (
    <>
      <JsonLd data={jsonLd} />
      <Navbar isLoggedIn={isLoggedIn} userName={userName} />
      <main id="conteudo-principal">
        <Hero isLoggedIn={isLoggedIn} userName={userName} />
        <Marquee />
        <PlansStack />
        <Fidelidade />
        <Temas />
        <FAQ />
      </main>
      <Footer isLoggedIn={isLoggedIn} />
    </>
  );
}
