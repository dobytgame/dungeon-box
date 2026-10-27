import GuildPlansViewAnalytics from '@/components/analytics/GuildPlansViewAnalytics';
import GuildLpBenefits from '@/components/guild-lp/GuildLpBenefits';
import GuildLpPageAnalytics from '@/components/guild-lp/GuildLpPageAnalytics';
import GuildLpShippingEstimate from '@/components/guild-lp/GuildLpShippingEstimate';
import GuildLpFaq from '@/components/guild-lp/GuildLpFaq';
import GuildLpFinalCta from '@/components/guild-lp/GuildLpFinalCta';
import GuildLpFooter from '@/components/guild-lp/GuildLpFooter';
import GuildLpHero from '@/components/guild-lp/GuildLpHero';
import GuildLpHowItWorks from '@/components/guild-lp/GuildLpHowItWorks';
import GuildLpIdentification from '@/components/guild-lp/GuildLpIdentification';
import GuildLpInitialKit from '@/components/guild-lp/GuildLpInitialKit';
import GuildLpNav from '@/components/guild-lp/GuildLpNav';
import GuildLpPlans from '@/components/guild-lp/GuildLpPlans';
import GuildLpProduct from '@/components/guild-lp/GuildLpProduct';
import GuildLpSocialProof from '@/components/guild-lp/GuildLpSocialProof';
import { displayName, getProfile } from '@/lib/dashboard/queries';
import { guildMemberCount } from '@/lib/guild-lp/constants';
import { getHomeV2Testimonials } from '@/lib/home-v2/cms';
import { getWaitlistCount } from '@/lib/launch/waitlist';
import { guildCampaignPageMetadata } from '@/lib/seo/metadata';
import { createClient } from '@/lib/supabase/server';

export const metadata = guildCampaignPageMetadata;

export default async function GuildCampaignPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfile(user.id) : null;
  const userName = user ? displayName(profile, user.email) : null;
  const isLoggedIn = !!user;
  const [waitlistCount, testimonials] = await Promise.all([
    getWaitlistCount(),
    getHomeV2Testimonials(),
  ]);
  const memberCount = guildMemberCount(waitlistCount);

  return (
    <>
      <GuildLpPageAnalytics />
      <GuildPlansViewAnalytics />
      <GuildLpNav isLoggedIn={isLoggedIn} userName={userName} />
      <main id="conteudo-principal">
        <GuildLpHero memberCount={memberCount} />
        <GuildLpProduct />
        <GuildLpInitialKit />
        <GuildLpHowItWorks />
        <GuildLpPlans />
        <GuildLpShippingEstimate />
        <GuildLpSocialProof testimonials={testimonials} />
        <GuildLpIdentification />
        <GuildLpBenefits />
        <GuildLpFinalCta />
        <GuildLpFaq />
      </main>
      <GuildLpFooter isLoggedIn={isLoggedIn} memberCount={memberCount} />
    </>
  );
}
