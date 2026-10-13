import HomeV2LandingPage from '@/components/home-v2/HomeV2LandingPage';
import JsonLd from '@/components/seo/JsonLd';
import { homePageMetadata } from '@/lib/seo/metadata';
import { buildHomeJsonLd } from '@/lib/seo/structured-data';

export const metadata = homePageMetadata;

export default async function Home() {
  const jsonLd = buildHomeJsonLd();

  return (
    <>
      <JsonLd data={jsonLd} />
      <HomeV2LandingPage />
    </>
  );
}
