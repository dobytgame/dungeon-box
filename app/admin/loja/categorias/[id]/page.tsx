import Link from 'next/link';
import { notFound } from 'next/navigation';
import StoreCategoryForm from '@/components/admin/StoreCategoryForm';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminStoreCategory } from '@/lib/admin/store-categories';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminStoreCategoryPage({ params }: Props) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const category = await getAdminStoreCategory(admin, id);

  if (!category) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/loja/categorias"
        className="inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-console"
      >
        ← Voltar para categorias
      </Link>
      <StoreCategoryForm category={category} />
    </div>
  );
}
