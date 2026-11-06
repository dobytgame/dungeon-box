import type { Metadata, Viewport } from 'next';
import { redirect } from 'next/navigation';
import {
  BLACK_FRIDAY_PLAN_SLUG,
  getBlackFridayWindow,
  isBlackFridayOption,
} from '@/lib/campaigns/black-friday';
import { PAGARME_CONFIGURED } from '@/lib/pagarme/client';
import { getAddresses, getProfile } from '@/lib/dashboard/queries';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { createClient } from '@/lib/supabase/server';
import { findBlockingSubscriptionForPlan } from '@/lib/subscriptions/find-blocking';
import BlackFridayCheckout from './checkout-client';
import ClosedNotice from './closed-notice';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = privatePageMetadata('Checkout Black Friday');

export const viewport: Viewport = {
  themeColor: '#0b0807',
  viewportFit: 'cover',
};

export default async function BlackFridayCheckoutPage({
  searchParams,
}: {
  searchParams: { plano?: string };
}) {
  const option = isBlackFridayOption(searchParams.plano) ? searchParams.plano : 'mensal';
  const offerWindow = getBlackFridayWindow();

  if (offerWindow !== 'open') {
    return <ClosedNotice reason={offerWindow} />;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(`/black-friday/checkout?plano=${option}`)}`);
  }

  const { data: plan } = await supabase
    .from('plans')
    .select('id, name, price_cents')
    .eq('slug', BLACK_FRIDAY_PLAN_SLUG)
    .eq('is_active', true)
    .single();

  if (!plan || !PAGARME_CONFIGURED) {
    return <ClosedNotice reason="unavailable" />;
  }

  const blocking = await findBlockingSubscriptionForPlan(supabase, user.id, plan.id);
  if (blocking && blocking.status !== 'pending') {
    return <ClosedNotice reason="subscribed" />;
  }

  const [addresses, profile] = await Promise.all([getAddresses(user.id), getProfile(user.id)]);

  return (
    <BlackFridayCheckout
      initialOption={option}
      planCents={plan.price_cents}
      addresses={addresses}
      profile={profile}
    />
  );
}
