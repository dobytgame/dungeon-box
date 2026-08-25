'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import {
  deleteStoreKitThemeAction,
  saveStoreKitThemeAction,
} from '@/lib/admin/actions';
import type { AdminStoreKitThemeRow } from '@/lib/admin/store-kit-themes';
import { generateSeoSlug } from '@/lib/seo/slug';

const inputClass =
  'mt-2 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white';
const labelClass =
  'block font-display text-xs uppercase tracking-widest text-stone-400';

interface Props {
  theme?: AdminStoreKitThemeRow | null;
}

export default function StoreKitThemeForm({ theme }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState(theme?.name ?? '');
  const [slug, setSlug] = useState(theme?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(Boolean(theme?.slug));

  function submitForm(formData: FormData) {
    setError('');
    startTransition(async () => {
      const result = await saveStoreKitThemeAction(theme?.id ?? null, formData);
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      if ('id' in result) {
        router.push(`/admin/loja/temas/${result.id}`);
        router.refresh();
      }
    });
  }

  return (
    <form
      className="max-w-2xl space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        submitForm(new FormData(event.currentTarget));
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="kit_number" className={labelClass}>
            Número do kit
          </label>
          <input
            id="kit_number"
            name="kit_number"
            type="number"
            min={1}
            required
            defaultValue={theme?.kitNumber ?? ''}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="sort_order" className={labelClass}>
            Ordem
          </label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={theme?.sortOrder ?? 0}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="name" className={labelClass}>
          Nome
        </label>
        <input
          id="name"
          name="name"
          required
          value={name}
          onChange={(event) => {
            const nextName = event.target.value;
            setName(nextName);
            if (!theme && !slugEdited) {
              setSlug(generateSeoSlug(nextName));
            }
          }}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="slug" className={labelClass}>
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          required
          value={slug}
          onChange={(event) => {
            setSlugEdited(true);
            setSlug(event.target.value);
          }}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Descrição
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={theme?.description ?? ''}
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
          defaultValue={theme?.imageUrl ?? ''}
          className={inputClass}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-300">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={theme?.isActive ?? true}
        />
        Ativo na loja
      </label>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex cursor-pointer items-center gap-2 rounded-sm bg-console px-5 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar tema
        </button>

        {theme ? (
          <button
            type="button"
            disabled={deletePending || pending}
            onClick={() => {
              if (!window.confirm('Excluir este tema da loja?')) return;
              setDeletePending(true);
              setError('');
              void deleteStoreKitThemeAction(theme.id).then((result) => {
                setDeletePending(false);
                if ('error' in result && result.error) {
                  setError(result.error);
                  return;
                }
                router.push('/admin/loja/temas');
                router.refresh();
              });
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-red-500/30 bg-red-500/10 px-5 py-2.5 font-display text-xs uppercase tracking-widest text-red-300 disabled:opacity-50"
          >
            {deletePending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Excluir
          </button>
        ) : null}
      </div>
    </form>
  );
}
