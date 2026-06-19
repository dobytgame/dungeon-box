'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { saveThemeAction } from '@/lib/admin/actions';
import type { Theme } from '@/lib/dashboard/types';

const inputClass =
  'mt-2 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white';
const labelClass =
  'block font-display text-xs uppercase tracking-widest text-stone-400';

interface Props {
  theme?: Theme | null;
}

export default function ThemeForm({ theme }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const now = new Date();

  return (
    <form
      className="max-w-2xl space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError('');
        startTransition(async () => {
          const result = await saveThemeAction(theme?.id ?? null, formData);
          if ('error' in result && result.error) {
            setError(result.error);
            return;
          }
          if ('id' in result) {
            router.push(`/admin/temas/${result.id}`);
            router.refresh();
          }
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="month_number" className={labelClass}>
            Mês
          </label>
          <input
            id="month_number"
            name="month_number"
            type="number"
            min={1}
            max={12}
            required
            defaultValue={theme?.month_number ?? now.getMonth() + 1}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="year" className={labelClass}>
            Ano
          </label>
          <input
            id="year"
            name="year"
            type="number"
            min={2024}
            required
            defaultValue={theme?.year ?? now.getFullYear()}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="slug" className={labelClass}>
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          required
          defaultValue={theme?.slug ?? ''}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="name" className={labelClass}>
          Nome
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={theme?.name ?? ''}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="emoji" className={labelClass}>
          Emoji
        </label>
        <input
          id="emoji"
          name="emoji"
          defaultValue={theme?.emoji ?? ''}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="image_url" className={labelClass}>
          URL da imagem
        </label>
        <input
          id="image_url"
          name="image_url"
          type="url"
          defaultValue={theme?.image_url ?? ''}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="lore" className={labelClass}>
          Lore
        </label>
        <textarea
          id="lore"
          name="lore"
          rows={4}
          defaultValue={theme?.lore ?? ''}
          className={inputClass}
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={theme?.is_active ?? false}
            className="rounded border-white/20"
          />
          Ativo
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            name="is_revealed"
            defaultChecked={theme?.is_revealed ?? false}
            className="rounded border-white/20"
          />
          Revelado no site
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex cursor-pointer items-center gap-2 rounded-sm bg-console px-5 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Salvar tema
      </button>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
