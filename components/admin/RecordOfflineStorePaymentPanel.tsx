'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { recordOfflineStorePaymentAction } from '@/lib/admin/actions';
import { formatMoney } from '@/lib/dashboard/format';

interface Props {
  paymentId: string;
  defaultAmountCents: number;
  isCustom?: boolean;
}

function todayInputValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function centsToReaisInput(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export default function RecordOfflineStorePaymentPanel({
  paymentId,
  defaultAmountCents,
  isCustom = false,
}: Props) {
  const router = useRouter();
  const [paidAt, setPaidAt] = useState(todayInputValue);
  const [amountReais, setAmountReais] = useState(centsToReaisInput(defaultAmountCents));
  const [method, setMethod] = useState('pix');
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function submit() {
    if (
      !window.confirm(
        'Confirmar que o cliente pagou diretamente para a DungeonBox (sem gateway)? O pedido entrará na fila de produção.'
      )
    ) {
      return;
    }

    setMessage('');
    setError('');
    startTransition(async () => {
      const result = await recordOfflineStorePaymentAction({
        paymentId,
        paidAt,
        amountReais,
        method,
        note,
      });
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      setMessage('Pagamento registrado. O pedido foi liberado para produção.');
      setNote('');
      router.refresh();
    });
  }

  return (
    <section className="rounded-sm border border-emerald-400/25 bg-emerald-500/[0.04] p-5 md:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300/80">
        Pagamento fora do gateway
      </p>
      <h3 className="mt-2 font-display text-lg uppercase tracking-wide text-white">
        Registrar pagamento direto
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-stone-400">
        Use quando o cliente pagou por PIX, transferência ou dinheiro{' '}
        <strong className="font-medium text-stone-200">direto para vocês</strong>, sem
        Asaas/Pagar.me. O pedido {isCustom ? 'personalizado ' : ''}passa para produção como
        se tivesse sido aprovado no checkout.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            Data do pagamento
          </span>
          <input
            type="date"
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
            className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            Valor (R$)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={amountReais}
            onChange={(event) => setAmountReais(event.target.value)}
            placeholder="0,00"
            className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          />
          <span className="mt-1 block text-xs text-stone-600">
            Pedido: {formatMoney(defaultAmountCents)}
          </span>
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            Forma de pagamento
          </span>
          <select
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          >
            <option value="pix">PIX (conta DungeonBox)</option>
            <option value="manual">Transferência / TED / DOC</option>
            <option value="cash">Dinheiro / presencial</option>
          </select>
        </label>
        <label className="block sm:col-span-2 lg:col-span-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            Observação
          </span>
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ex.: comprovante no WhatsApp"
            className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="mt-5 cursor-pointer rounded-sm border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 font-display text-xs uppercase tracking-widest text-emerald-100 transition hover:border-emerald-300/60 disabled:opacity-50"
      >
        {pending ? 'Registrando…' : 'Confirmar pagamento e liberar pedido'}
      </button>

      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-sm text-emerald-200" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
