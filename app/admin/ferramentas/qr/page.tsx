import AdminQrGeneratorClient from '@/components/admin/AdminQrGeneratorClient';
import { requireAdmin } from '@/lib/admin/auth';
import { getQrPresets } from '@/lib/admin/qr-presets';
import { getCanonicalSiteUrl } from '@/lib/seo/site';

export default async function AdminQrGeneratorPage() {
  await requireAdmin();

  return (
    <AdminQrGeneratorClient
      defaultSiteUrl={getCanonicalSiteUrl()}
      presets={getQrPresets()}
    />
  );
}
