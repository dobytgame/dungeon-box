'use client';

import { useEffect, useState } from 'react';
import type { Address, Profile } from '@/lib/dashboard/types';
import type { PlanSlug } from '@/lib/checkout/plans';
import type { CheckoutData } from '@/lib/checkout/types';
import CheckoutShell from './CheckoutShell';
import StepAddress from './StepAddress';
import StepPayment from './StepPayment';
import StepPlan from './StepPlan';

interface Props {
  planSlug: PlanSlug;
  addresses: Address[];
  profile: Profile | null;
  userEmail: string;
}

export default function CheckoutFlow({
  planSlug,
  addresses,
  profile,
  userEmail,
}: Props) {
  const defaultAddress =
    addresses.find((a) => a.is_default) ?? addresses[0] ?? null;

  const [step, setStep] = useState(1);
  const [data, setData] = useState<CheckoutData>({
    planSlug,
    paintKitBump: null,
    addressId: defaultAddress?.id ?? '',
    specialNotes: '',
  });

  useEffect(() => {
    setData((prev) => ({ ...prev, planSlug }));
  }, [planSlug]);

  return (
    <CheckoutShell step={step} data={data} addresses={addresses}>
      {step === 1 ? (
        <StepPlan data={data} setData={setData} onNext={() => setStep(2)} />
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
          profile={profile}
          userEmail={userEmail}
          onBack={() => setStep(2)}
        />
      ) : null}
    </CheckoutShell>
  );
}
