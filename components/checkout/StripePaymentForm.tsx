'use client';

import { useCallback, useState } from 'react';
import {
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';

type Props = {
  disabled?: boolean;
  onSuccess: () => void;
  onError: (message: string) => void;
};

export default function StripePaymentForm({
  disabled,
  onSuccess,
  onError,
}: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!stripe || !elements || disabled || submitting) return;

      setSubmitting(true);
      onError('');

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message ?? 'Não foi possível confirmar o pagamento.');
        setSubmitting(false);
        return;
      }

      if (
        paymentIntent &&
        (paymentIntent.status === 'succeeded' ||
          paymentIntent.status === 'processing')
      ) {
        onSuccess();
        return;
      }

      setSubmitting(false);
    },
    [stripe, elements, disabled, submitting, onSuccess, onError]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />
      <button
        type="submit"
        disabled={!stripe || !elements || disabled || submitting}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-ember px-5 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition-opacity duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Processando…
          </>
        ) : (
          'Assinar agora'
        )}
      </button>
    </form>
  );
}
