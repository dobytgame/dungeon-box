import Link from 'next/link';
import { notFound } from 'next/navigation';
import StoreProductForm from '@/components/admin/StoreProductForm';
import { requireAdmin } from '@/lib/admin/auth';
import { listAdminPlans } from '@/lib/admin/queries';
import { listAdminStoreCategories } from '@/lib/admin/store-categories';
import { getAdminStoreProduct } from '@/lib/admin/store-products';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminStoreProductPage({ params }: Props) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const [product, plans, categories] = await Promise.all([
    getAdminStoreProduct(admin, id),
    listAdminPlans(admin),
    listAdminStoreCategories(admin),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/loja"
        className="inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-console"
      >
        ← Voltar para loja
      </Link>
      <StoreProductForm
        product={product}
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
