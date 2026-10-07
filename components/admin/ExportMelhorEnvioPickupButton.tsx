'use client';

import { useState } from 'react';
import { exportAwaitingPickupMelhorEnvioAction } from '@/lib/admin/actions';

function downloadXlsx(filename: string, fileBase64: string) {
  const binary = atob(fileBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ExportMelhorEnvioPickupButton({
  cardIds,
}: {
  cardIds: string[];
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={pending || cardIds.length === 0}
        title="Planilha da cotação múltipla do Melhor Envio. Todos os pedidos usam a caixa de 12 × 22 × 31 cm e 0,5 kg."
        onClick={() => {
          setPending(true);
          setError('');
          setMessage('');
          void exportAwaitingPickupMelhorEnvioAction(cardIds).then((result) => {
            setPending(false);
            if ('error' in result && result.error) {
              setError(result.error);
              return;
            }
            if ('success' in result && result.success) {
              downloadXlsx(result.filename, result.fileBase64);
              const skipped =
                result.skipped.length > 0
                  ? ` ${result.skipped.length} ficaram de fora.`
                  : '';
              setMessage(
                result.exported === 1
                  ? `1 pedido exportado.${skipped}`
                  : `${result.exported} pedidos exportados.${skipped}`
              );
            }
          });
        }}
        className="w-full cursor-pointer rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? 'Gerando…' : 'Exportar Melhor Envio'}
      </button>
      {error ? (
        <p className="mt-1 font-mono text-[10px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-1 font-mono text-[10px] text-emerald-300" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
