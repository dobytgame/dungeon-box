'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Address, Profile } from '@/lib/dashboard/types';
import { checkoutHref, type PlanSlug } from '@/lib/checkout/plans';
import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { COMBO_BILLING_ENABLED, isComboTerm } from '@/lib/checkout/combo-billing';
import type { CheckoutData } from '@/lib/checkout/types';
import CheckoutPageAnalytics from '@/components/analytics/CheckoutPageAnalytics';
import {
  buildCheckoutEcommerceItems,
  buildCheckoutEcommerceValue,
} from '@/lib/analytics/checkout-items';
import { trackAddShippingInfo } from '@/lib/analytics/data-layer';
import CheckoutShell from './CheckoutShell';
import StepAddress from './StepAddress';
import StepPayment from './StepPayment';
import StepPlan from './StepPlan';

interface Props {
  planSlugs: PlanSlug[];
  initialBillingTerm?: BillingTerm;
  addresses: Address[];
  profile: Profile | null;
  userEmail: string;
  activePlanSlugs?: PlanSlug[];
}

export default function CheckoutFlow({
  planSlugs,
  initialBillingTerm = 'monthly',
  addresses,
  profile,
  userEmail,
  activePlanSlugs = [],
}: Props) {
  const router = useRouter();
  const defaultAddress =
    addresses.find((a) => a.is_default) ?? addresses[0] ?? null;

  const [step, setStep] = useState(1);
  const [profileState, setProfileState] = useState(profile);
  const [data, setData] = useState<CheckoutData>({
    planSlugs,
    billingTerm:
      COMBO_BILLING_ENABLED &&
      planSlugs.length === 1 &&
      isComboTerm(initialBillingTerm)
        ? initialBillingTerm
        : 'monthly',
    installmentCount: 1,
    paintKitBump: null,
    paintKitBumpRecurring: false,
    addressId: defaultAddress?.id ?? '',
    specialNotes: '',
  });

  useEffect(() => {
    setProfileState(profile);
  }, [profile]);

  const planSlugsKey = planSlugs.join(',');

  useEffect(() => {
    setData((prev) => {
      const prevKey = prev.planSlugs.join(',');
      if (prevKey === planSlugsKey) {
        return prev;
      }

      return {
        ...prev,
        planSlugs,
        billingTerm:
          !COMBO_BILLING_ENABLED || planSlugs.length > 1 ? 'monthly' : prev.billingTerm,
        installmentCount: planSlugs.length > 1 ? 1 : prev.installmentCount,
        discountedPlanCentsByPlan: undefined,
        couponCode: null,
        couponSummary: null,
        shippingByPlan: undefined,
      };
    });
  }, [planSlugsKey, planSlugs]);

  function handlePlanSlugsChange(nextSlugs: PlanSlug[]) {
    let comboForUrl: Exclude<BillingTerm, 'monthly'> | undefined;

    setData((prev) => {
      const nextBillingTerm =
        !COMBO_BILLING_ENABLED || nextSlugs.length > 1
          ? 'monthly'
          : isComboTerm(prev.billingTerm)
            ? prev.billingTerm
            : 'monthly';

      comboForUrl =
        COMBO_BILLING_ENABLED &&
        nextSlugs.length === 1 &&
        isComboTerm(nextBillingTerm)
          ? nextBillingTerm
          : undefined;

      return {
        ...prev,
        planSlugs: nextSlugs,
        billingTerm: nextBillingTerm,
        installmentCount: nextSlugs.length > 1 ? 1 : prev.installmentCount,
        discountedPlanCentsByPlan: undefined,
        couponCode: null,
        couponSummary: null,
        shippingByPlan: undefined,
      };
    });

    router.replace(checkoutHref(nextSlugs, comboForUrl), { scroll: false });
  }

  return (
    <>
      <CheckoutPageAnalytics planSlugs={planSlugs} />
      <CheckoutShell step={step} data={data} addresses={addresses}>
      {step === 1 ? (
        <StepPlan
          data={data}
          setData={setData}
          activePlanSlugs={activePlanSlugs}
          onPlanSlugsChange={handlePlanSlugsChange}
          onNext={() => setStep(2)}
        />
      ) : null}
      {step === 2 ? (
        <StepAddress
          data={data}
          setData={setData}
          addresses={addresses}
          onNext={() => {
            const items = buildCheckoutEcommerceItems(data);
            trackAddShippingInfo({
              items,
              value: buildCheckoutEcommerceValue(data),
            });
            setStep(3);
          }}
          onBack={() => setStep(1)}
        />
      ) : null}
      {step === 3 ? (
        <StepPayment
          data={data}
          setData={setData}
          profile={profileState}
          userEmail={userEmail}
          onProfileSaved={(updates) => {
            setProfileState((current) =>
              current ? { ...current, ...updates } : current
            );
          }}
          onBack={() => setStep(2)}
        />
      ) : null}
      </CheckoutShell>
    </>
  );
}
