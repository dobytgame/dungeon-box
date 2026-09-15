'use client';

import { useState } from 'react';
import { exportActiveSubscribersCsvAction } from '@/lib/admin/actions';

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ExportActiveSubscribersCsvButton() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="space-y-2 rounded-sm border border-white/[0.06] bg-stone-950/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-sm uppercase tracking-wide text-white">
            Exportar assinantes ativos
          </p>
          <p className="mt-1 max-w-2xl text-sm text-stone-500">
            Gera um CSV com nome, e-mail e celular dos clientes com assinatura
            ativa. Cada cliente aparece uma vez.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setPending(true);
            setError('');
            setMessage('');

            void exportActiveSubscribersCsvAction().then((result) => {
              setPending(false);
              if ('error' in result && result.error) {
                setError(result.error);
                return;
              }
              if ('success' in result && result.success) {
                downloadCsv(result.filename, result.csv);
                setMessage(
                  result.count === 1
                    ? '1 cliente exportado.'
                    : `${result.count} clientes exportados.`
                );
              }
            });
          }}
          className="cursor-pointer shrink-0 rounded-sm border border-console/40 bg-console/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-console transition hover:bg-console/20 disabled:opacity-50"
        >
          {pending ? 'Gerando…' : 'Baixar CSV'}
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
