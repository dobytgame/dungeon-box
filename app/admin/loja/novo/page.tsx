import AdminFormNav from '@/components/admin/AdminFormNav';
import StoreProductForm from '@/components/admin/StoreProductForm';
import { requireAdmin } from '@/lib/admin/auth';
import { listAdminPlans } from '@/lib/admin/queries';
import { listAdminStoreCategoryOptions } from '@/lib/admin/store-categories';

export default async function AdminStoreNewPage() {
  const { admin } = await requireAdmin();
  const [plans, categoryOptions] = await Promise.all([
    listAdminPlans(admin),
    listAdminStoreCategoryOptions(admin),
  ]);

  return (
    <div className="space-y-6">
      <AdminFormNav backHref="/admin/loja" backLabel="Voltar para loja" />
      <StoreProductForm
        planOptions={plans.map((plan) => ({
          slug: plan.slug,
          name: plan.name,
        }))}
        categoryOptions={categoryOptions}
      />
    </div>
  );
}
