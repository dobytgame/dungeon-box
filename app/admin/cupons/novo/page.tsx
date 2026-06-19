import Link from 'next/link';
import PromoCodeForm from '@/components/admin/PromoCodeForm';

export default function AdminNewPromoPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/cupons"
        className="inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-console"
      >
        ← Voltar para cupons
      </Link>
      <PromoCodeForm />
    </div>
  );
}
