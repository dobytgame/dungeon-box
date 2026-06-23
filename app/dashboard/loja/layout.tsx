import { StoreCartProvider } from '@/components/store/StoreCartProvider';
import { StoreCatalogProvider } from '@/components/store/StoreCatalogProvider';
import {
  getManageableSubscriptions,
  requireDashboardUser,
} from '@/lib/dashboard/queries';
import { getMonthlyKitProductsForUser } from '@/lib/store/monthly-kits';

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireDashboardUser();
  const subscriptions = await getManageableSubscriptions(user.id);
  const monthlyKits = await getMonthlyKitProductsForUser(subscriptions);

  return (
    <StoreCatalogProvider monthlyKits={monthlyKits}>
      <StoreCartProvider>{children}</StoreCartProvider>
    </StoreCatalogProvider>
  );
}
