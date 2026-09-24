'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  adminMarkUgcRewardSentAction,
  adminUpdateUgcMarketingAction,
} from '@/lib/ugc/admin-actions';
import { UGC_POTENTIALS, UGC_USAGE_TAGS } from '@/lib/ugc/options';
import type { UgcRewardStatus } from '@/lib/ugc/types';

interface Props {
  submissionId: string;
  usageTags: string[];
  potential: string | null;
  notes: string | null;
  rewardStatus: UgcRewardStatus;
}

export default function AdminUgcMarketingForm({
  submissionId,
  usageTags,
  potential,
  notes,
  rewardStatus,
}: Props) {
  const [tags, setTags] = useState(usageTags);
  const [pot, setPot] = useState(potential ?? '');
  const [note, setNote] = useState(notes ?? '');
  const [pending, setPending] = useState(false);
  const [sentPending, setSentPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSave() {
    setPending(true);
    setError('');
    setMessage('');
    const result = await adminUpdateUgcMarketingAction(submissionId, {
      usageTags: tags,
      potential: pot || null,
      notes: note,
    });
    setPending(false);
    if ('error' in result && result.error) {
      setError(result.error);
      return;
    }
    setMessage('Classificação salva.');
  }

  async function handleMarkSent() {
    setSentPending(true);
    setError('');
    setMessage('');
    const result = await adminMarkUgcRewardSentAction(submissionId);
    setSentPending(false);
    if ('error' in result && result.error) {
      setError(result.error);
      return;
    }
    setMessage('Brinde marcado como enviado.');
  }

  return (
    <div className="space-y-4 border-t border-zinc-800/80 pt-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        Classificação de marketing
      </p>
      <div className="flex flex-wrap gap-2">
        {UGC_USAGE_TAGS.map((item) => {
          const active = tags.includes(item.value);
          return (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                setTags((prev) =>
                  prev.includes(item.value)
                    ? prev.filter((tag) => tag !== item.value)
                    : [...prev, item.value]
                )
              }
              className={`rounded border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] ${
                active
                  ? 'border-console/40 bg-console/10 text-console'
                  : 'border-zinc-800 text-zinc-500'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="grid gap-3 md:grid-cols-[14rem_1fr_auto] md:items-end">
        <div>
          <label
            htmlFor="ugc-potential"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500"
          >
            Potencial
          </label>
          <select
            id="ugc-potential"
            value={pot}
            onChange={(event) => setPot(event.target.value)}
            className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200"
          >
            <option value="">Sem classificação</option>
            {UGC_POTENTIALS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="ugc-mkt-notes"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500"
          >
            Observações
          </label>
          <input
            id="ugc-mkt-notes"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
          />
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => void handleSave()}
          className="inline-flex min-h-[44px] items-center justify-center rounded border border-console/30 bg-console/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-console"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar tags'}
        </button>
      </div>
      {rewardStatus === 'queued' ? (
        <button
          type="button"
          disabled={sentPending}
          onClick={() => void handleMarkSent()}
          className="inline-flex min-h-[40px] items-center rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-200"
        >
          {sentPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Marcar brinde enviado'}
        </button>
      ) : null}
      {message ? <p className="text-sm text-zinc-300">{message}</p> : null}
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
