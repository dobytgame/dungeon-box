import Link from 'next/link';
import StoreProductForm from '@/components/admin/StoreProductForm';
import { requireAdmin } from '@/lib/admin/auth';
import { listAdminPlans } from '@/lib/admin/queries';
import { listAdminStoreCategories } from '@/lib/admin/store-categories';

export default async function AdminStoreNewPage() {
  const { admin } = await requireAdmin();
  const [plans, categories] = await Promise.all([
    listAdminPlans(admin),
    listAdminStoreCategories(admin),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/loja"
        className="inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-console"
      >
        ← Voltar para loja
      </Link>
      <StoreProductForm
        planOptions={plans.map((plan) => ({
          slug: plan.slug,
          name: plan.name,
        }))}
        categoryOptions={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
      />
    </div>
  );
}
