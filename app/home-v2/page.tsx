import HomeV2Analytics from '@/components/home-v2/HomeV2Analytics';
import HomeV2EvidenceStrip from '@/components/home-v2/HomeV2EvidenceStrip';
import HomeV2Faq from '@/components/home-v2/HomeV2Faq';
import HomeV2FinalCta from '@/components/home-v2/HomeV2FinalCta';
import HomeV2Footer from '@/components/home-v2/HomeV2Footer';
import HomeV2GrowthJourney from '@/components/home-v2/HomeV2GrowthJourney';
import HomeV2Header from '@/components/home-v2/HomeV2Header';
import HomeV2Hero from '@/components/home-v2/HomeV2Hero';
import HomeV2MonthlyDungeon from '@/components/home-v2/HomeV2MonthlyDungeon';
import HomeV2Motion from '@/components/home-v2/HomeV2Motion';
import HomeV2PlanSelector from '@/components/home-v2/HomeV2PlanSelector';
import HomeV2PreviewBadge from '@/components/home-v2/HomeV2PreviewBadge';
import HomeV2SocialProof from '@/components/home-v2/HomeV2SocialProof';
import HomeV2StickyMobileCta from '@/components/home-v2/HomeV2StickyMobileCta';
import HomeV2StoreShelf from '@/components/home-v2/HomeV2StoreShelf';
import {
  getHomeV2MonthlyDungeon,
  getHomeV2StoreProducts,
  getHomeV2Testimonials,
} from '@/lib/home-v2/cms';
import { getHomeV2Plans } from '@/lib/home-v2/content';

export default async function HomeV2Page() {
  const [products, dungeon, testimonials] = await Promise.all([
    getHomeV2StoreProducts(),
    getHomeV2MonthlyDungeon(),
    getHomeV2Testimonials(),
  ]);
  const plans = getHomeV2Plans();

  return (
    <>
      <HomeV2Analytics />
      <HomeV2Motion />
      <HomeV2PreviewBadge />
      <HomeV2Header />
      <main id="conteudo-principal">
        <HomeV2Hero />
        <HomeV2EvidenceStrip />
        <HomeV2GrowthJourney />
        <HomeV2PlanSelector plans={plans} />
        <HomeV2MonthlyDungeon dungeon={dungeon} />
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
