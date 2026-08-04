import { notFound } from 'next/navigation';
import AdminFormNav from '@/components/admin/AdminFormNav';
import StoreProductForm from '@/components/admin/StoreProductForm';
import { requireAdmin } from '@/lib/admin/auth';
import { listAdminPlans } from '@/lib/admin/queries';
import { listAdminStoreCategoryOptions } from '@/lib/admin/store-categories';
import { getAdminStoreProduct } from '@/lib/admin/store-products';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminStoreProductPage({ params }: Props) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const [product, plans, categoryOptions] = await Promise.all([
    getAdminStoreProduct(admin, id),
    listAdminPlans(admin),
    listAdminStoreCategoryOptions(admin),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <AdminFormNav
        backHref="/admin/loja"
        backLabel="Voltar para loja"
        createHref="/admin/loja/novo"
        createLabel="Criar novo produto"
      />
      <StoreProductForm
        product={product}
        planOptions={plans.map((plan) => ({
          slug: plan.slug,
          name: plan.name,
          priceCents: plan.price_cents,
        }))}
        categoryOptions={categoryOptions}
      />
    </div>
  );
}
