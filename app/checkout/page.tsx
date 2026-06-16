import type { Metadata } from 'next';
import CheckoutFlow from '@/components/checkout/CheckoutFlow';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { parseCheckoutPlanSlugs } from '@/lib/checkout/plans';
import {
  getAddresses,
  getActivePlanSlugs,
  getProfile,
  requireDashboardUser,
} from '@/lib/dashboard/queries';

export const metadata: Metadata = privatePageMetadata('Checkout');

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { plan?: string | string[] };
}) {
  const { user } = await requireDashboardUser();
  const [addresses, profile, activePlanSlugs] = await Promise.all([
    getAddresses(user.id),
    getProfile(user.id),
    getActivePlanSlugs(user.id),
  ]);
  const planSlugs = parseCheckoutPlanSlugs(searchParams);

  return (
    <CheckoutFlow
      planSlugs={planSlugs}
      addresses={addresses}
      profile={profile}
      userEmail={user.email ?? ''}
      activePlanSlugs={activePlanSlugs}
    />
  );
}
