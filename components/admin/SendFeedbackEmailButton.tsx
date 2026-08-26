'use client';

import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { adminSendFeedbackRequestAction } from '@/lib/admin/actions';
import { formatDateTime } from '@/lib/dashboard/format';

interface Props {
  cycleId: string;
  feedbackRequestSentAt?: string | null;
  compact?: boolean;
  /** Kanban pós-envio: rótulo curto, sem linha extra de “e-mail enviado”. */
  minimal?: boolean;
  onSent?: () => void;
}

export default function SendFeedbackEmailButton({
  cycleId,
  feedbackRequestSentAt,
  compact = false,
  minimal = false,
  onSent,
}: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sentAt, setSentAt] = useState(feedbackRequestSentAt ?? null);

  async function handleSend() {
    setPending(true);
    setError('');
    setMessage('');

    const result = await adminSendFeedbackRequestAction(cycleId);
    setPending(false);

    if ('error' in result && result.error) {
      setError(result.error);
      return;
    }

    const now = new Date().toISOString();
    setSentAt(now);
    setMessage('E-mail de avaliação enviado.');
    onSent?.();
  }

  const label = sentAt
    ? minimal
      ? 'Reenviar avaliação'
      : 'Reenviar e-mail de avaliação'
    : minimal
      ? 'Enviar avaliação'
      : 'Enviar e-mail de avaliação';

  return (
    <div className={compact ? 'w-full' : ''}>
      {sentAt && !minimal ? (
        <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-emerald-400/90">
          E-mail enviado · {formatDateTime(sentAt)}
        </p>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={() => void handleSend()}
        title={
          sentAt ? `E-mail de avaliação enviado em ${formatDateTime(sentAt)}` : undefined
        }
        className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded border border-violet-500/30 bg-violet-500/10 font-mono uppercase tracking-[0.12em] text-violet-200 transition hover:border-violet-500/45 hover:bg-violet-500/15 disabled:opacity-50 ${
          compact
            ? 'min-h-[32px] w-full px-2 text-[10px]'
            : 'px-4 py-2 text-[10px]'
        }`}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Mail className="h-3.5 w-3.5" />
        )}
        {pending ? 'Enviando…' : label}
      </button>

      {error ? (
        <p className={`text-red-400 ${compact ? 'mt-2 text-[10px]' : 'mt-3 text-sm'}`} role="alert">
          {error}
        </p>
      ) : null}
      {message && !minimal ? (
        <p
          className={`text-emerald-300 ${compact ? 'mt-2 text-[10px]' : 'mt-3 text-sm'}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
