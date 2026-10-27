import LandingPageAnalytics from '@/components/analytics/LandingPageAnalytics';
import HomeV2Analytics from '@/components/home-v2/HomeV2Analytics';
import HomeV2EvidenceStrip from '@/components/home-v2/HomeV2EvidenceStrip';
import HomeV2Faq from '@/components/home-v2/HomeV2Faq';
import HomeV2FinalCta from '@/components/home-v2/HomeV2FinalCta';
import HomeV2Footer from '@/components/home-v2/HomeV2Footer';
import HomeV2Header from '@/components/home-v2/HomeV2Header';
import HomeV2KitShowcase from '@/components/home-v2/HomeV2KitShowcase';
import HomeV2Hero from '@/components/home-v2/HomeV2Hero';
import HomeV2MonthlyDungeon from '@/components/home-v2/HomeV2MonthlyDungeon';
import HomeV2Motion from '@/components/home-v2/HomeV2Motion';
import HomeV2PlanSelector from '@/components/home-v2/HomeV2PlanSelector';
import HomeV2SocialProof from '@/components/home-v2/HomeV2SocialProof';
import HomeV2StickyMobileCta from '@/components/home-v2/HomeV2StickyMobileCta';
import HomeV2StoreShelf from '@/components/home-v2/HomeV2StoreShelf';
import { displayName, getProfile } from '@/lib/dashboard/queries';
import {
  getHomeV2MonthlyDungeon,
  getHomeV2StoreProducts,
  getHomeV2Testimonials,
} from '@/lib/home-v2/cms';
import {
  getHomeV2Plans,
  HOME_V2_SHOW_MONTHLY_DUNGEON,
} from '@/lib/home-v2/content';
import { createClient } from '@/lib/supabase/server';

export default async function HomeV2LandingPage() {
  const [products, testimonials, dungeon] = await Promise.all([
    getHomeV2StoreProducts(),
    getHomeV2Testimonials(),
    HOME_V2_SHOW_MONTHLY_DUNGEON ? getHomeV2MonthlyDungeon() : Promise.resolve(null),
  ]);
  const plans = getHomeV2Plans();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfile(user.id) : null;
  const userName = user ? displayName(profile, user.email) : null;

  return (
    <>
      <LandingPageAnalytics />
      <HomeV2Analytics />
      <HomeV2Motion />
      <HomeV2Header isLoggedIn={Boolean(user)} userName={userName} />
      <main id="conteudo-principal">
        <HomeV2Hero />
        <HomeV2EvidenceStrip />
        <HomeV2KitShowcase />
        <HomeV2PlanSelector plans={plans} />
        {HOME_V2_SHOW_MONTHLY_DUNGEON && dungeon ? (
          <HomeV2MonthlyDungeon dungeon={dungeon} />
        ) : null}
        <HomeV2StoreShelf products={products} />
        <HomeV2SocialProof testimonials={testimonials} />
        <HomeV2Faq />
        <HomeV2FinalCta />
      </main>
      <HomeV2Footer />
      <HomeV2StickyMobileCta />
    </>
  );
}
