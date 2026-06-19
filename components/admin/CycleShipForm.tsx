'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { shipSubscriptionCycleAction } from '@/lib/admin/actions';

interface Props {
  cycleId: string;
  defaultCarrier?: string;
  onSuccess?: () => void;
}

export default function CycleShipForm({
  cycleId,
  defaultCarrier = 'Correios',
  onSuccess,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        setError('');
        setMessage('');
        startTransition(async () => {
          const result = await shipSubscriptionCycleAction(cycleId, formData);
          if ('error' in result && result.error) {
            setError(result.error);
            return;
          }
          setMessage('Envio registrado. E-mail de rastreio disparado.');
          form.reset();
          onSuccess?.();
        });
      }}
    >
      <div>
        <label
          htmlFor={`tracking-${cycleId}`}
          className="block font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500"
        >
          Código de rastreio
        </label>
        <input
          id={`tracking-${cycleId}`}
          name="tracking_code"
          required
          disabled={pending}
          placeholder="BR123456789BR"
          autoFocus
          className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2.5 font-mono text-sm text-zinc-100 outline-none focus:border-console/50"
        />
      </div>
      <div>
        <label
          htmlFor={`carrier-${cycleId}`}
          className="block font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500"
        >
          Transportadora
        </label>
        <input
          id={`carrier-${cycleId}`}
          name="carrier"
          defaultValue={defaultCarrier}
          disabled={pending}
          className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-console/50"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded border border-console/30 bg-console/10 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-console transition hover:bg-console/15 disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Salvando…
          </>
        ) : (
          'Marcar como enviado'
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
