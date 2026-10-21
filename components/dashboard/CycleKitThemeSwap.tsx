'use client';

import { useState, useTransition } from 'react';
import { changeCycleKitThemeAction } from '@/app/dashboard/actions';
import MonthlyKitThemePicker from '@/components/store/MonthlyKitThemePicker';
import { formatStoreKitThemeLabel, type StoreKitTheme } from '@/lib/store/kit-themes';

interface Props {
  subscriptionId: string;
  cycleId: string;
  cycleNumber: number;
  currentTheme: StoreKitTheme;
  themes: StoreKitTheme[];
  canChange: boolean;
  lockedReason: string | null;
  compact?: boolean;
}

export default function CycleKitThemeSwap({
  subscriptionId,
  cycleId,
  cycleNumber,
  currentTheme,
  themes,
  canChange,
  lockedReason,
  compact = false,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState(currentTheme.id);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selected = themes.find((theme) => theme.id === selectedId) ?? currentTheme;
  const dirty = selectedId !== currentTheme.id;

  function save() {
    setMessage('');
    setError('');
    startTransition(async () => {
      const result = await changeCycleKitThemeAction({
        subscriptionId,
        cycleId,
        themeId: selectedId,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(
        result.notice
          ? 'Tema atualizado. A produção já foi avisada da troca.'
          : 'Tema do kit definido.'
      );
    });
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div>
        <p className="home-v2-display text-[11px] tracking-[0.2em] text-mesa-jade">
          Tema do kit
        </p>
        <p className="mt-1 text-sm text-mesa-parchment">
          Ciclo #{cycleNumber} · {formatStoreKitThemeLabel(currentTheme)}
        </p>
        {canChange ? (
          <p className="mt-2 text-sm leading-relaxed text-mesa-ash">
            Todas as assinaturas começam no kit 1. Você pode trocar o tema enquanto o
            kit ainda não entrou em produção.
          </p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-mesa-ash">
            {lockedReason}
          </p>
        )}
      </div>

      {canChange ? (
        <>
          <fieldset disabled={pending} className="min-w-0">
            <MonthlyKitThemePicker
              themes={themes}
              selectedThemeId={selectedId}
              onChange={setSelectedId}
            />
          </fieldset>
          <button
            type="button"
            disabled={pending || !dirty}
            onClick={save}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-sm border border-mesa-ember/40 bg-mesa-ember/10 px-5 py-2.5 font-display text-xs uppercase tracking-widest text-mesa-ember transition hover:bg-mesa-ember/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Salvando…' : `Usar ${formatStoreKitThemeLabel(selected)}`}
          </button>
        </>
      ) : null}

      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-mesa-jade" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
