import Link from 'next/link';
import { notFound } from 'next/navigation';
import StoreBannerForm from '@/components/admin/StoreBannerForm';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminStoreBanner } from '@/lib/admin/store-banners';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminStoreBannerEditPage({ params }: Props) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const banner = await getAdminStoreBanner(admin, id);

  if (!banner) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/loja/banners"
        className="inline-block font-display text-xs uppercase tracking-widest text-stone-500 hover:text-console"
      >
        ← Voltar para banners
      </Link>
      <StoreBannerForm banner={banner} />
    </div>
  );
}
