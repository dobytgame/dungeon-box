import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/sections/Hero';
import Marquee from '@/components/sections/Marquee';
import PlansStack from '@/components/sections/PlansStack';
import Fidelidade from '@/components/sections/Fidelidade';
import Temas from '@/components/sections/Temas';
import FAQ from '@/components/sections/FAQ';
import { displayName, getProfile } from '@/lib/dashboard/queries';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfile(user.id) : null;
  const userName = user ? displayName(profile, user.email) : null;
  const isLoggedIn = !!user;

  return (
    <>
      <Navbar isLoggedIn={isLoggedIn} userName={userName} />
      <main>
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
