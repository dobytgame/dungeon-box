'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Address, Profile } from '@/lib/dashboard/types';
import { checkoutHref, type PlanSlug } from '@/lib/checkout/plans';
import type { CheckoutData } from '@/lib/checkout/types';
import CheckoutShell from './CheckoutShell';
import StepAddress from './StepAddress';
import StepPayment from './StepPayment';
import StepPlan from './StepPlan';

interface Props {
  planSlugs: PlanSlug[];
  addresses: Address[];
  profile: Profile | null;
  userEmail: string;
  activePlanSlugs?: PlanSlug[];
}

export default function CheckoutFlow({
  planSlugs,
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
        discountedPlanCentsByPlan: undefined,
        couponCode: null,
        couponSummary: null,
        shippingByPlan: undefined,
      };
    });
  }, [planSlugsKey, planSlugs]);

  function handlePlanSlugsChange(nextSlugs: PlanSlug[]) {
    setData((prev) => ({
      ...prev,
      planSlugs: nextSlugs,
      discountedPlanCentsByPlan: undefined,
      couponCode: null,
      couponSummary: null,
      shippingByPlan: undefined,
    }));
    router.replace(checkoutHref(nextSlugs), { scroll: false });
  }

  return (
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
          onNext={() => setStep(3)}
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
  );
}
