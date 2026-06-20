import StoreCheckoutForm from '@/components/store/StoreCheckoutForm';
import StoreSubNav from '@/components/store/StoreSubNav';
import {
  getAddresses,
  getManageableSubscriptions,
  requireDashboardUser,
} from '@/lib/dashboard/queries';

export default async function StoreCheckoutPage() {
  const { user } = await requireDashboardUser();
  const [addresses, subscriptions] = await Promise.all([
    getAddresses(user.id),
    getManageableSubscriptions(user.id),
  ]);

  return (
    <div>
      <StoreSubNav />
      <StoreCheckoutForm addresses={addresses} subscriptions={subscriptions} />
    </div>
  );
}
