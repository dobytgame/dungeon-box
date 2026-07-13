'use client';

import { useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import DashboardCard from '@/components/dashboard/DashboardCard';
import StarRating from '@/components/dashboard/StarRating';
import { formatDate } from '@/lib/dashboard/format';
import type { FeedbackCycleOption } from '@/lib/feedback/types';

const labelClass =
  'block font-display text-xs uppercase tracking-widest text-stone-400';

async function uploadFeedbackImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/feedback/upload', {
    method: 'POST',
    body: formData,
  });

  const payload = (await response.json()) as { path?: string; error?: string };
  if (!response.ok || !payload.path) {
    throw new Error(payload.error ?? 'Falha no upload.');
  }

  return payload.path;
}

interface Props {
  cycles: FeedbackCycleOption[];
  initialCycleId?: string | null;
}

export default function FeedbackForm({ cycles, initialCycleId }: Props) {
  const availableCycles = useMemo(
    () => cycles.filter((cycle) => !cycle.hasFeedback),
    [cycles]
  );

  const defaultCycleId =
    initialCycleId && availableCycles.some((c) => c.id === initialCycleId)
      ? initialCycleId
      : availableCycles[0]?.id ?? '';

  const [cycleId, setCycleId] = useState(defaultCycleId);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCycle = availableCycles.find((cycle) => cycle.id === cycleId);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (imagePaths.length >= 3) {
      setError('Máximo de 3 fotos por avaliação.');
      return;
    }

    setError('');
    setUploading(true);
    try {
      const path = await uploadFeedbackImage(file);
      setImagePaths((prev) => [...prev, path]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Falha no upload.'
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (!cycleId) {
      setError('Selecione qual entrega você está avaliando.');
      return;
    }

    if (rating < 1) {
      setError('Selecione uma nota de 1 a 5 estrelas.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId,
          rating,
          message: message.trim() || null,
          imagePaths,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Não foi possível enviar.');
      }

      setSuccess(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Não foi possível enviar.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <DashboardCard title="Feedback enviado" accent="gold">
        <p className="text-sm leading-relaxed text-stone-300">
          Obrigado por compartilhar sua experiência! Sua avaliação ajuda a forjar
          caixas cada vez melhores para a guilda.
        </p>
      </DashboardCard>
    );
  }

  if (availableCycles.length === 0) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <DashboardCard
        title="Avaliar entrega"
        description="Conte como foi receber e montar sua caixa. Fotos da mesa ou das miniaturas são bem-vindas."
        accent="gold"
      >
        <div className="space-y-6">
          <div>
            <label htmlFor="feedback-cycle" className={labelClass}>
              Qual entrega?
            </label>
            <select
              id="feedback-cycle"
              value={cycleId}
              onChange={(event) => setCycleId(event.target.value)}
              disabled={submitting}
              className="mt-2 w-full rounded-sm border border-white/10 bg-stone-950 px-4 py-3 text-sm text-stone-200 focus:border-ember/50 focus:outline-none"
            >
              {availableCycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  Ciclo #{cycle.cycleNumber}
                  {cycle.themeName
                    ? ` — ${cycle.themeEmoji ?? ''} ${cycle.themeName}`
                    : ''}
                  {cycle.deliveredAt
                    ? ` · entregue em ${formatDate(cycle.deliveredAt)}`
                    : ''}
                </option>
              ))}
            </select>
            {selectedCycle?.themeName ? (
              <p className="mt-2 text-sm text-stone-500">
                Tema: {selectedCycle.themeEmoji} {selectedCycle.themeName}
              </p>
            ) : null}
          </div>

          <StarRating
            value={rating}
            onChange={setRating}
            disabled={submitting}
          />

          <div>
            <label htmlFor="feedback-message" className={labelClass}>
              Comentário (opcional)
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={submitting}
              rows={5}
              maxLength={2000}
              placeholder="O que achou das peças, da embalagem ou da experiência geral?"
              className="mt-2 w-full resize-y rounded-sm border border-white/10 bg-stone-950 px-4 py-3 text-sm text-stone-200 placeholder:text-stone-600 focus:border-ember/50 focus:outline-none"
            />
          </div>

          <div>
            <p className={labelClass}>Fotos (opcional)</p>
            <p className="mt-1 text-sm text-stone-500">
              Até 3 imagens — JPG, PNG ou WebP, máx. 5 MB cada.
            </p>

            {imagePaths.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {imagePaths.map((path) => (
                  <li
                    key={path}
                    className="flex items-center justify-between gap-3 rounded-sm border border-white/10 bg-stone-950/60 px-3 py-2 text-sm text-stone-400"
                  >
                    <span className="truncate font-mono text-xs">{path.split('/').pop()}</span>
                    <button
                      type="button"
                      disabled={submitting || uploading}
                      onClick={() =>
                        setImagePaths((prev) => prev.filter((item) => item !== path))
                      }
                      className="inline-flex cursor-pointer items-center gap-1 text-xs uppercase tracking-wider text-stone-500 transition hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {imagePaths.length < 3 ? (
              <>
                <button
                  type="button"
                  disabled={submitting || uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-white/15 px-4 py-3 text-sm text-stone-400 transition hover:border-white/25 hover:text-stone-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {uploading ? 'Enviando…' : 'Adicionar foto'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            ) : null}
          </div>

          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-sm bg-ember px-6 py-3 font-display text-sm uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando…
              </>
            ) : (
              'Enviar avaliação'
            )}
          </button>
        </div>
      </DashboardCard>
    </form>
  );
}
