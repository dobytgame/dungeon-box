'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { recordOfflineSubscriptionPaymentAction } from '@/lib/admin/actions';
import { formatDate, formatMoney } from '@/lib/dashboard/format';

interface Props {
  subscriptionId: string;
  defaultAmountCents: number | null;
  nextBillingDate: string | null;
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

export default function RecordOfflinePaymentPanel({
  subscriptionId,
  defaultAmountCents,
  nextBillingDate,
}: Props) {
  const router = useRouter();
  const [paidAt, setPaidAt] = useState(todayInputValue);
  const [amountReais, setAmountReais] = useState(
    defaultAmountCents != null ? centsToReaisInput(defaultAmountCents) : ''
  );
  const [method, setMethod] = useState('pix');
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function submit() {
    if (
      !window.confirm(
        'Lançar este pagamento e reativar a assinatura? A cobrança do próximo mês no cartão continua no gateway.'
      )
    ) {
      return;
    }

    setMessage('');
    setError('');
    startTransition(async () => {
      const result = await recordOfflineSubscriptionPaymentAction({
        subscriptionId,
        paidAt,
        amountReais,
        method,
        note,
      });
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      setMessage('Pagamento lançado. Assinatura ativa de novo.');
      setNote('');
      router.refresh();
    });
  }

  return (
    <section className="rounded-sm border border-emerald-400/25 bg-emerald-500/[0.04] p-5 md:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300/80">
        Atraso · PIX avulso
      </p>
      <h3 className="mt-2 font-display text-lg uppercase tracking-wide text-white">
        Registrar pagamento feito
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-stone-400">
        Use quando o cartão falhou e o cliente pagou o mês atrasado no PIX.
        O lançamento reativa a assinatura e{' '}
        <strong className="font-medium text-stone-200">
          não cancela a próxima cobrança no cartão
        </strong>
        {nextBillingDate ? ` (${formatDate(nextBillingDate)})` : ''}.
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
          {defaultAmountCents != null ? (
            <span className="mt-1 block text-xs text-stone-600">
              Mensalidade: {formatMoney(defaultAmountCents)}
            </span>
          ) : null}
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            Método
          </span>
          <select
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            className="mt-1 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          >
            <option value="pix">PIX</option>
            <option value="manual">Manual / transferência</option>
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
            placeholder="Ex.: PIX enviado no WhatsApp"
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
        {pending ? 'Lançando…' : 'Lançar pagamento e reativar'}
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
