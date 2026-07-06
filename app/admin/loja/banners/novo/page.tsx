import Link from 'next/link';
import StoreBannerForm from '@/components/admin/StoreBannerForm';

export default function AdminStoreBannerNewPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/loja/banners"
        className="inline-block font-display text-xs uppercase tracking-widest text-stone-500 hover:text-console"
      >
        ← Voltar para banners
      </Link>
      <StoreBannerForm />
    </div>
  );
}
