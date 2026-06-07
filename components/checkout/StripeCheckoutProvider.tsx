'use client';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import type { ReactNode } from 'react';
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe/public';

const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

type Props = {
  clientSecret: string;
  children: ReactNode;
};

export default function StripeCheckoutProvider({
  clientSecret,
  children,
}: Props) {
  if (!stripePromise) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#e85d04',
            colorBackground: '#0c0a09',
            colorText: '#fafaf9',
            colorDanger: '#f87171',
            borderRadius: '2px',
            fontFamily: 'system-ui, sans-serif',
          },
        },
        locale: 'pt-BR',
      }}
    >
      {children}
    </Elements>
  );
}
