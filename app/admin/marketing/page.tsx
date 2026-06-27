import AdminMarketingClient from '@/components/admin/AdminMarketingClient';
import { requireAdmin } from '@/lib/admin/auth';
import {
  MARKETING_AUDIENCE_LABELS,
  resolveMarketingAudienceEmails,
} from '@/lib/admin/marketing-audience';
import type { MarketingAudience } from '@/lib/admin/types';

export default async function AdminMarketingPage() {
  const { admin, profile } = await requireAdmin();

  const audiences = Object.keys(MARKETING_AUDIENCE_LABELS) as MarketingAudience[];
  const counts = await Promise.all(
    audiences.map(async (audience) => {
      const emails = await resolveMarketingAudienceEmails(admin, audience, profile);
      return [audience, emails.length] as const;
    })
  );

  const initialAudienceCounts = Object.fromEntries(counts) as Partial<
    Record<MarketingAudience, number>
  >;

  return <AdminMarketingClient initialAudienceCounts={initialAudienceCounts} />;
}
