'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { updateCycleProductionNotesAction } from '@/lib/admin/actions';

interface Props {
  cycleId: string;
  productionNotes: string | null;
  onSuccess?: () => void;
}

export default function CycleProductionNotesForm({
  cycleId,
  productionNotes,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <form
      key={`${cycleId}-${productionNotes ?? 'empty'}`}
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        setSubmitting(true);
        setError('');
        setMessage('');

        void updateCycleProductionNotesAction(cycleId, formData).then((result) => {
          setSubmitting(false);
          if ('error' in result && result.error) {
            setError(result.error);
            return;
          }
          const saved =
            ((formData.get('production_notes') as string) ?? '').trim();
          setMessage(saved ? 'Comentários salvos.' : 'Comentários removidos.');
          onSuccess?.();
        });
      }}
    >
      <div>
        <label
          htmlFor={`production-notes-${cycleId}`}
          className="block font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500"
        >
          Comentários do pedido
        </label>
        <textarea
          id={`production-notes-${cycleId}`}
          name="production_notes"
          rows={4}
          maxLength={2000}
          disabled={submitting}
          defaultValue={productionNotes ?? ''}
          placeholder="Ex.: cliente pediu troca de tema, incluir cartão personalizado, peça com defeito na última caixa…"
          className="mt-2 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm leading-relaxed text-zinc-100 outline-none focus:border-console/50"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Visível em destaque nos cards do kanban para toda a equipe de produção.
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
        ) : productionNotes ? (
          'Atualizar comentários'
        ) : (
          'Salvar comentários'
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
