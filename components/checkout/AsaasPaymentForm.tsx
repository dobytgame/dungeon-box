'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';

export type AsaasCardPayload = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

interface Props {
  disabled?: boolean;
  onSubmit: (card: AsaasCardPayload) => Promise<void>;
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
  'w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white placeholder:text-stone-600 focus:border-ember/50 focus:outline-none focus:ring-1 focus:ring-ember/30 disabled:opacity-50';

export default function AsaasPaymentForm({ disabled, onSubmit, onError }: Props) {
  const [holderName, setHolderName] = useState('');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [ccv, setCcv] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (disabled || submitting) return;

      const parsedExpiry = parseExpiry(expiry);
      const cardNumber = digitsOnly(number);

      if (!holderName.trim()) {
        onError('Informe o nome impresso no cartão.');
        return;
      }
      if (cardNumber.length < 13) {
        onError('Número do cartão inválido.');
        return;
      }
      if (!parsedExpiry) {
        onError('Validade do cartão inválida.');
        return;
      }
      if (ccv.replace(/\D/g, '').length < 3) {
        onError('CVV inválido.');
        return;
      }

      setSubmitting(true);
      onError('');

      try {
        await onSubmit({
          holderName: holderName.trim(),
          number: cardNumber,
          expiryMonth: parsedExpiry.month,
          expiryYear: parsedExpiry.year,
          ccv: digitsOnly(ccv),
        });
      } catch (err) {
        onError(
          err instanceof Error ? err.message : 'Não foi possível confirmar o pagamento.'
        );
        setSubmitting(false);
      }
    },
    [disabled, submitting, holderName, number, expiry, ccv, onSubmit, onError]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="card-holder" className="mb-1.5 block text-xs text-stone-500">
          Nome no cartão
        </label>
        <input
          id="card-holder"
          type="text"
          autoComplete="cc-name"
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
          disabled={disabled || submitting}
          className={inputClassName}
          placeholder="Como está no cartão"
        />
      </div>

      <div>
        <label htmlFor="card-number" className="mb-1.5 block text-xs text-stone-500">
          Número do cartão
        </label>
        <input
          id="card-number"
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          value={number}
          onChange={(e) => setNumber(formatCardNumber(e.target.value))}
          disabled={disabled || submitting}
          className={inputClassName}
          placeholder="0000 0000 0000 0000"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="card-expiry" className="mb-1.5 block text-xs text-stone-500">
            Validade
          </label>
          <input
            id="card-expiry"
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            disabled={disabled || submitting}
            className={inputClassName}
            placeholder="MM/AA"
          />
        </div>
        <div>
          <label htmlFor="card-ccv" className="mb-1.5 block text-xs text-stone-500">
            CVV
          </label>
          <input
            id="card-ccv"
            type="text"
            inputMode="numeric"
            autoComplete="cc-csc"
            value={ccv}
            onChange={(e) => setCcv(digitsOnly(e.target.value).slice(0, 4))}
            disabled={disabled || submitting}
            className={inputClassName}
            placeholder="123"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled || submitting}
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
