import CheckoutFlow from '@/components/checkout/CheckoutFlow';
import { resolvePlanSlug } from '@/lib/checkout/plans';
import {
  getAddresses,
  getProfile,
  requireDashboardUser,
} from '@/lib/dashboard/queries';

export const metadata = {
  title: 'Checkout — DungeonBox',
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const { user } = await requireDashboardUser();
  const [addresses, profile] = await Promise.all([
    getAddresses(user.id),
    getProfile(user.id),
  ]);
  const planSlug = resolvePlanSlug(searchParams.plan);

  return (
    <CheckoutFlow
      planSlug={planSlug}
      addresses={addresses}
      profile={profile}
      userEmail={user.email ?? ''}
    />
  );
}
