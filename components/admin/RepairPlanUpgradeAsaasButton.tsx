'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { repairAllPlanUpgradeAsaasRecurrencesAction } from '@/lib/admin/actions';

export default function RepairPlanUpgradeAsaasButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="space-y-2 rounded-sm border border-white/[0.06] bg-stone-950/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-sm uppercase tracking-wide text-white">
            Corrigir upgrades no Asaas
          </p>
          <p className="mt-1 max-w-2xl text-sm text-stone-500">
            Recria assinaturas mensais ativas no Asaas com o plano e valor corretos
            (cancela a recorrência antiga e abre uma nova com o cartão tokenizado).
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setPending(true);
            setError('');
            setMessage('');

            void repairAllPlanUpgradeAsaasRecurrencesAction().then((result) => {
              setPending(false);
              if ('error' in result && result.error) {
                setError(result.error);
                return;
              }
              if ('success' in result && result.success) {
                const parts = [
                  `${result.scanned} assinatura(s) verificada(s).`,
                  `${result.recreated} recorrência(s) recriada(s).`,
                ];
                if (result.alreadyAligned > 0) {
                  parts.push(`${result.alreadyAligned} já estavam corretas.`);
                }
                if (result.failed.length > 0) {
                  parts.push(`${result.failed.length} falha(s).`);
                }
                setMessage(parts.join(' '));
                router.refresh();
              }
            });
          }}
          className="cursor-pointer shrink-0 rounded-sm border border-ember/40 bg-ember/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-ember transition hover:bg-ember/20 disabled:opacity-50"
        >
          {pending ? 'Corrigindo…' : 'Varredura de upgrades'}
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
