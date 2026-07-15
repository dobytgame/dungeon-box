'use client';

import { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { adminSetFeedbackFeaturedOnLpAction } from '@/lib/admin/actions';

interface Props {
  feedbackId: string;
  featuredOnLp: boolean;
  hasMessage: boolean;
  compact?: boolean;
  onFeaturedChange?: (featured: boolean) => void;
}

export default function AdminFeedbackLpToggle({
  feedbackId,
  featuredOnLp,
  hasMessage,
  compact = false,
  onFeaturedChange,
}: Props) {
  const [pending, setPending] = useState(false);
  const [featured, setFeatured] = useState(featuredOnLp);
  const [error, setError] = useState('');

  async function handleToggle(event?: React.MouseEvent) {
    event?.stopPropagation();
    event?.preventDefault();

    setPending(true);
    setError('');

    const next = !featured;
    const result = await adminSetFeedbackFeaturedOnLpAction(feedbackId, next);
    setPending(false);

    if ('error' in result && result.error) {
      setError(result.error);
      return;
    }

    setFeatured(next);
    onFeaturedChange?.(next);
  }

  const disabled = pending || !hasMessage;

  if (compact) {
    return (
      <div className="min-w-[7.5rem]" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          disabled={disabled}
          onClick={(event) => void handleToggle(event)}
          title={
            !hasMessage
              ? 'Requer comentário para publicar'
              : featured
                ? 'Remover da landing page'
                : 'Publicar na landing page'
          }
          className={`inline-flex min-h-[36px] cursor-pointer items-center justify-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition disabled:cursor-not-allowed disabled:opacity-50 ${
            featured
              ? 'border-ember/40 bg-ember/10 text-ember hover:border-ember/55 hover:bg-ember/15'
              : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200'
          }`}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {featured ? 'Na LP' : 'Publicar'}
        </button>
        {error ? (
          <p className="mt-1 max-w-[10rem] text-[10px] leading-snug text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="border-t border-zinc-800/80 pt-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        Landing page
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void handleToggle()}
          className={`inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-50 ${
            featured
              ? 'border-ember/40 bg-ember/10 text-ember hover:border-ember/55 hover:bg-ember/15'
              : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800'
          }`}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Globe className="h-4 w-4" aria-hidden="true" />
          )}
          {featured ? 'Remover da LP' : 'Publicar na LP'}
        </button>

        <p className="text-xs text-zinc-500">
          {featured
            ? 'Visível na seção de depoimentos da home.'
            : 'Não aparece na home até ser publicado.'}
        </p>
      </div>

      {!hasMessage ? (
        <p className="mt-2 text-xs text-amber-400/90" role="status">
          Só é possível publicar feedbacks com comentário.
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
