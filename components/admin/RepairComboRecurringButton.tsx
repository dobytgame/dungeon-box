'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { repairAllComboRecurringSubscriptionsAction } from '@/lib/admin/actions';

export default function RepairComboRecurringButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="space-y-2 rounded-sm border border-white/[0.06] bg-stone-950/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-sm uppercase tracking-wide text-white">
            Alinhar renovação combo (Pagar.me / Asaas)
          </p>
          <p className="mt-1 max-w-2xl text-sm text-stone-500">
            Ajusta assinantes combo já existentes para cobrar o{' '}
            <strong className="font-medium text-stone-400">mesmo pacote</strong> a cada
            3/6/12 meses (valor <code className="text-stone-400">combo_total_cents</code>
            ), em vez de mensalidade cheia. Preenche total do combo no banco quando faltar.
            Respeita quem desativou renovação ou agendou mensal.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setPending(true);
            setError('');
            setMessage('');

            void repairAllComboRecurringSubscriptionsAction().then((result) => {
              setPending(false);
              if ('error' in result && result.error) {
                setError(result.error);
                return;
              }
              if ('success' in result && result.success) {
                setMessage(
                  [
                    `${result.scanned} combo(s) verificados.`,
                    `${result.synced} alinhado(s) no gateway.`,
                    `${result.skipped} ignorado(s).`,
                    result.failed > 0 ? `${result.failed} falha(s).` : null,
                    result.backfilledComboTotal > 0
                      ? `${result.backfilledComboTotal} total(is) de combo gravado(s) no banco.`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' ')
                );
                router.refresh();
              }
            });
          }}
          className="cursor-pointer shrink-0 rounded-sm border border-ember/40 bg-ember/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-ember transition hover:bg-ember/20 disabled:opacity-50"
        >
          {pending ? 'Alinhando…' : 'Varredura combos'}
        </button>
      </div>
      {error ? (
        <p className="font-mono text-[11px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="font-mono text-[11px] text-emerald-300" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
