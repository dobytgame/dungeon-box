'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import {
  deleteStoreCategoryAction,
  saveStoreCategoryAction,
} from '@/lib/admin/actions';
import type { AdminStoreCategoryRow } from '@/lib/admin/store-categories';
import { generateSeoSlug } from '@/lib/seo/slug';
import AdminHtmlEditor from '@/components/admin/AdminHtmlEditor';
import StoreCategoryMediaFields from '@/components/admin/StoreCategoryMediaFields';

const inputClass =
  'mt-2 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white';
const labelClass =
  'block font-display text-xs uppercase tracking-widest text-stone-400';

interface Props {
  category?: AdminStoreCategoryRow | null;
  parentOptions?: Array<{ id: string; name: string; depth: number }>;
}

export default function StoreCategoryForm({
  category,
  parentOptions = [],
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(Boolean(category?.slug));
  const saveModeRef = useRef<'edit' | 'create-another'>('edit');

  function submitForm(formData: FormData) {
    setError('');

    startTransition(async () => {
      const result = await saveStoreCategoryAction(category?.id ?? null, formData);
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      if ('id' in result) {
        if (saveModeRef.current === 'create-another') {
          router.push('/admin/loja/categorias/novo');
        } else {
          router.push(`/admin/loja/categorias/${result.id}`);
        }
        router.refresh();
      }
    });
  }

  return (
    <form
      className="max-w-3xl space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        submitForm(new FormData(event.currentTarget));
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
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
              if (!category && !slugEdited) {
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
            readOnly={Boolean(category)}
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value);
            }}
            className={inputClass}
          />
          {!category && slug ? (
            <p className="mt-1 text-xs text-stone-500">URL: /loja/{slug}</p>
          ) : null}
        </div>
      </div>

      <StoreCategoryMediaFields
        bannerUrl={category?.banner_url ?? null}
        thumbUrl={category?.thumb_url ?? null}
      />

      <AdminHtmlEditor
        name="description"
        label="Descrição (HTML)"
        defaultValue={category?.description}
      />

      <div>
        <label htmlFor="parent_id" className={labelClass}>
          Categoria pai
        </label>
        <select
          id="parent_id"
          name="parent_id"
          defaultValue={category?.parent_id ?? ''}
          className={inputClass}
        >
          <option value="">Nenhuma (categoria de topo)</option>
          {parentOptions
            .filter((option) => option.id !== category?.id)
            .map((option) => (
              <option key={option.id} value={option.id}>
                {`${'  '.repeat(option.depth)}${option.depth > 0 ? '↳ ' : ''}${option.name}`}
              </option>
            ))}
        </select>
        <p className="mt-2 text-xs text-stone-500">
          Subcategorias aparecem dentro da categoria pai na loja. Apenas categorias
          de topo entram no menu principal.
        </p>
      </div>

      <div>
        <label htmlFor="sort_order" className={labelClass}>
          Ordem
        </label>
        <input
          id="sort_order"
          name="sort_order"
          type="number"
          defaultValue={category?.sort_order ?? 0}
          className={inputClass}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-300">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={category?.is_active ?? true}
          className="rounded border-white/20"
        />
        Categoria ativa
      </label>

      {category ? (
        <p className="text-xs text-stone-500">
          {category.product_count} produto(s) nesta categoria.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          onClick={() => {
            saveModeRef.current = 'edit';
          }}
          className="inline-flex cursor-pointer items-center gap-2 rounded-sm bg-console px-5 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar categoria
        </button>

        <button
          type="submit"
          disabled={pending}
          onClick={() => {
            saveModeRef.current = 'create-another';
          }}
          className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-white/10 px-5 py-2.5 font-display text-xs uppercase tracking-widest text-stone-300 transition hover:border-console/40 hover:text-console disabled:opacity-50"
        >
          Salvar e criar outra
        </button>

        {category ? (
          <button
            type="button"
            disabled={deletePending || pending}
            onClick={() => {
              if (!window.confirm('Excluir esta categoria permanentemente?')) return;
              setDeletePending(true);
              setError('');
              void deleteStoreCategoryAction(category.id).then((result) => {
                setDeletePending(false);
                if ('error' in result && result.error) {
                  setError(result.error);
                  return;
                }
                router.push('/admin/loja/categorias');
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

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
