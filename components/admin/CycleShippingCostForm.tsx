'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { updateCycleShippingCostAction } from '@/lib/admin/actions';
import { formatMoney } from '@/lib/dashboard/format';

interface Props {
  cycleId: string;
  shippingCostCents: number | null;
  onSuccess?: () => void;
}

export default function CycleShippingCostForm({
  cycleId,
  shippingCostCents,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const defaultReais =
    shippingCostCents != null ? (shippingCostCents / 100).toFixed(2) : '';

  return (
    <form
      key={`${cycleId}-${shippingCostCents ?? 'empty'}`}
      className="max-w-md space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const shippingCostReais = Number.parseFloat(
          (formData.get('shipping_cost_reais') as string)?.replace(',', '.') ?? ''
        );
        if (Number.isNaN(shippingCostReais) || shippingCostReais < 0) {
          setError('Informe o custo de envio (use 0 se não houve custo).');
          return;
        }
        formData.set('shipping_cost_reais', shippingCostReais.toFixed(2));

        setSubmitting(true);
        setError('');
        setMessage('');

        void updateCycleShippingCostAction(cycleId, formData).then((result) => {
          setSubmitting(false);
          if ('error' in result && result.error) {
            setError(result.error);
            return;
          }
          setMessage(
            shippingCostCents != null
              ? 'Custo de envio atualizado.'
              : 'Custo de envio registrado.'
          );
          onSuccess?.();
        });
      }}
    >
      <div>
        <label
          htmlFor={`shipping-cost-edit-${cycleId}`}
          className="block font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500"
        >
          Valor pago ao transportador (R$)
        </label>
        <input
          id={`shipping-cost-edit-${cycleId}`}
          name="shipping_cost_reais"
          required
          disabled={submitting}
          defaultValue={defaultReais}
          placeholder="18,90"
          inputMode="decimal"
          className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-console/50"
        />
        <p className="mt-1 text-xs text-zinc-500">
          {shippingCostCents != null ? (
            <>
              Registrado: {formatMoney(shippingCostCents)}. Altere e salve para
              corrigir.
            </>
          ) : (
            <>Use 0 se o envio não teve custo (frete grátis ou retirada).</>
          )}
        </p>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex cursor-pointer items-center gap-2 rounded border border-console/30 bg-console/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-console transition hover:bg-console/15 disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Salvando…
          </>
        ) : shippingCostCents != null ? (
          'Atualizar custo de envio'
        ) : (
          'Salvar custo de envio'
        )}
      </button>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-300" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
