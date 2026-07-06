import { notFound } from 'next/navigation';
import AdminFormNav from '@/components/admin/AdminFormNav';
import StoreCategoryForm from '@/components/admin/StoreCategoryForm';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminStoreCategory, listAdminStoreCategoryOptions } from '@/lib/admin/store-categories';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminStoreCategoryPage({ params }: Props) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const [category, parentOptions] = await Promise.all([
    getAdminStoreCategory(admin, id),
    listAdminStoreCategoryOptions(admin),
  ]);

  if (!category) notFound();

  return (
    <div className="space-y-6">
      <AdminFormNav
        backHref="/admin/loja/categorias"
        backLabel="Voltar para categorias"
        createHref="/admin/loja/categorias/novo"
        createLabel="Criar nova categoria"
      />
      <StoreCategoryForm category={category} parentOptions={parentOptions} />
    </div>
  );
}
