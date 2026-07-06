import AdminFormNav from '@/components/admin/AdminFormNav';
import StoreCategoryForm from '@/components/admin/StoreCategoryForm';
import { requireAdmin } from '@/lib/admin/auth';
import { listAdminStoreCategoryOptions } from '@/lib/admin/store-categories';

export default async function AdminStoreCategoryNewPage() {
  const { admin } = await requireAdmin();
  const parentOptions = await listAdminStoreCategoryOptions(admin);

  return (
    <div className="space-y-6">
      <AdminFormNav
        backHref="/admin/loja/categorias"
        backLabel="Voltar para categorias"
      />
      <StoreCategoryForm parentOptions={parentOptions} />
    </div>
  );
}
