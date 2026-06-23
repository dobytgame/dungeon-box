import { StoreCartProvider } from '@/components/store/StoreCartProvider';
import { StoreCatalogProvider } from '@/components/store/StoreCatalogProvider';
import { requireDashboardUser } from '@/lib/dashboard/queries';
import { getMonthlyKitProductsForUser } from '@/lib/store/monthly-kits';

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, supabase } = await requireDashboardUser();
  const monthlyKits = await getMonthlyKitProductsForUser(user.id, supabase);

  return (
    <StoreCatalogProvider monthlyKits={monthlyKits}>
      <StoreCartProvider>{children}</StoreCartProvider>
    </StoreCatalogProvider>
  );
}
