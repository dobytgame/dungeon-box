import type { Metadata, Viewport } from 'next';
import { redirect } from 'next/navigation';
import {
  BLACK_FRIDAY_PLAN_SLUG,
  getBlackFridayWindow,
  isBlackFridayOption,
  parseBlackFridayCtaPlacement,
} from '@/lib/campaigns/black-friday';
import { recordBlackFridayCheckoutIntent } from '@/lib/campaigns/black-friday-tracking';
import { createAdminClient } from '@/lib/supabase/admin';
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
  searchParams: { plano?: string; origem?: string };
}) {
  const option = isBlackFridayOption(searchParams.plano) ? searchParams.plano : 'mensal';
  const ctaPlacement = searchParams.origem
    ? parseBlackFridayCtaPlacement(searchParams.origem)
    : 'direct';
  const offerWindow = getBlackFridayWindow();

  if (offerWindow !== 'open') {
    return <ClosedNotice reason={offerWindow} />;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = new URLSearchParams({ plano: option, origem: ctaPlacement });
    redirect(`/auth?next=${encodeURIComponent(`/black-friday/checkout?${next.toString()}`)}`);
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

  const admin = createAdminClient();
  void recordBlackFridayCheckoutIntent(admin, {
    userId: user.id,
    option,
    ctaPlacement,
  });

  return (
    <BlackFridayCheckout
      initialOption={option}
      planCents={plan.price_cents}
      addresses={addresses}
      profile={profile}
      ctaPlacement={ctaPlacement}
    />
  );
}
