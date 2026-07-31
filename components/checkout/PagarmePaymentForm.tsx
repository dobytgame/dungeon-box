'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { validateCreditCard } from '@/lib/payments/card-validation';
import { tokenizePagarmeCard } from '@/lib/pagarme/tokenize-card';

export type PagarmeCardPayload = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
};

export type PagarmeTokenResult = {
  token: string;
  last4: string;
  brand: string;
};

interface Props {
  disabled?: boolean;
  submitLabel?: string;
  onSubmit: (result: PagarmeTokenResult) => Promise<void>;
  onError: (message: string) => void;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function formatCardNumber(value: string): string {
  const digits = digitsOnly(value).slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function parseExpiry(expiry: string): { month: string; year: string } | null {
  const digits = digitsOnly(expiry);
  if (digits.length < 4) return null;
  const month = digits.slice(0, 2);
  const year = digits.slice(2);
  const monthNum = Number.parseInt(month, 10);
  if (monthNum < 1 || monthNum > 12) return null;
  return { month: String(monthNum), year };
}

const inputClassName =
  'w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-base text-white placeholder:text-stone-600 focus:border-ember/50 focus:outline-none focus:ring-1 focus:ring-ember/30 disabled:opacity-50 sm:text-sm';

export default function PagarmePaymentForm({
  disabled = false,
  submitLabel = 'Confirmar pagamento',
  onSubmit,
  onError,
}: Props) {
  const [holderName, setHolderName] = useState('');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (disabled || loading) return;

      const parsedExpiry = parseExpiry(expiry);
      if (!parsedExpiry) {
        onError('Validade do cartão inválida.');
        return;
      }

      const cardDigits = digitsOnly(number);
      const validation = validateCreditCard({
        holderName: holderName.trim(),
        number: cardDigits,
        expiryMonth: parsedExpiry.month,
        expiryYear: parsedExpiry.year,
        ccv: digitsOnly(cvv),
      });

      if (!validation.ok) {
        onError(validation.error);
        return;
      }

      setLoading(true);
      try {
        const tokenized = await tokenizePagarmeCard({
          holderName: holderName.trim(),
          number: cardDigits,
          expiryMonth: parsedExpiry.month,
          expiryYear: parsedExpiry.year,
          cvv: digitsOnly(cvv),
        });
        await onSubmit(tokenized);
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : 'Não foi possível validar o cartão.'
        );
      } finally {
        setLoading(false);
      }
    },
    [
      cvv,
      disabled,
      expiry,
      holderName,
      loading,
      number,
      onError,
      onSubmit,
    ]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs text-stone-500">Nome no cartão</label>
        <input
          className={inputClassName}
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
          autoComplete="cc-name"
          disabled={disabled || loading}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-stone-500">Número do cartão</label>
        <input
          className={inputClassName}
          value={number}
          onChange={(e) => setNumber(formatCardNumber(e.target.value))}
          inputMode="numeric"
          autoComplete="cc-number"
          disabled={disabled || loading}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-stone-500">Validade</label>
          <input
            className={inputClassName}
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            placeholder="MM/AA"
            inputMode="numeric"
            autoComplete="cc-exp"
            disabled={disabled || loading}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-stone-500">CVV</label>
          <input
            className={inputClassName}
            value={cvv}
            onChange={(e) => setCvv(digitsOnly(e.target.value).slice(0, 4))}
            inputMode="numeric"
            autoComplete="cc-csc"
            disabled={disabled || loading}
            required
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={disabled || loading}
        className="flex w-full items-center justify-center gap-2 rounded-sm bg-ember px-4 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Processando…
          </>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}
