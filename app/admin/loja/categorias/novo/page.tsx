import Link from 'next/link';
import StoreCategoryForm from '@/components/admin/StoreCategoryForm';
import { requireAdmin } from '@/lib/admin/auth';

export default async function AdminStoreCategoryNewPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/loja/categorias"
        className="inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-console"
      >
        ← Voltar para categorias
      </Link>
      <StoreCategoryForm />
    </div>
  );
}
