'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { adminApproveUgcAction, adminRejectUgcAction } from '@/lib/ugc/admin-actions';
import { UGC_REJECT_REASONS } from '@/lib/ugc/constants';
import type { UgcContentStatus } from '@/lib/ugc/types';

interface Props {
  submissionId: string;
  contentStatus: UgcContentStatus;
}

export default function AdminUgcReviewForm({ submissionId, contentStatus }: Props) {
  const [pending, setPending] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleApprove() {
    setPending('approve');
    setError('');
    setMessage('');
    const result = await adminApproveUgcAction(submissionId);
    setPending(null);
    if ('error' in result && result.error) {
      setError(result.error);
      return;
    }
    if (result.rewardQueued) {
      setMessage(
        result.cycleNumber
          ? `Aprovado. Brinde marcado no ciclo #${result.cycleNumber}.`
          : 'Aprovado. Brinde já estava na fila.'
      );
      return;
    }
    if (result.rewardReason === 'already_queued') {
      setMessage(
        'Aprovado. Este assinante já tem um brinde UGC na fila de outro envio.'
      );
      return;
    }
    setMessage(
      'Aprovado. Não há ciclo aberto (ainda não embalado) para encaixar o brinde.'
    );
  }

  async function handleReject() {
    if (!reason) {
      setError('Escolha um motivo de recusa.');
      return;
    }
    setPending('reject');
    setError('');
    setMessage('');
    const result = await adminRejectUgcAction(submissionId, reason, note);
    setPending(null);
    if ('error' in result && result.error) {
      setError(result.error);
      return;
    }
    setMessage('Envio recusado.');
  }

  return (
    <div className="space-y-5 border-t border-zinc-800/80 pt-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        Moderação
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void handleApprove()}
          className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded border border-console/30 bg-console/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-console transition hover:bg-console/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending === 'approve' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {contentStatus === 'approved' ? 'Reaprovar' : 'Aprovar e marcar brinde'}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,16rem)_1fr_auto] md:items-end">
        <div>
          <label
            htmlFor="ugc-reject-reason"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500"
          >
            Motivo da recusa
          </label>
          <select
            id="ugc-reject-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={pending !== null}
            className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200"
          >
            <option value="">Selecionar</option>
            {UGC_REJECT_REASONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="ugc-reject-note"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500"
          >
            Observação interna
          </label>
          <input
            id="ugc-reject-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={pending !== null}
            className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
          />
        </div>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void handleReject()}
          className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded border border-red-500/30 bg-red-500/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-red-200 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending === 'reject' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          Recusar
        </button>
      </div>

      {message ? (
        <p className="text-sm text-zinc-300" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
