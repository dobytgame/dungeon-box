'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import {
  deleteStoreCategoryAction,
  saveStoreCategoryAction,
} from '@/lib/admin/actions';
import type { AdminStoreCategoryRow } from '@/lib/admin/store-categories';

const inputClass =
  'mt-2 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white';
const labelClass =
  'block font-display text-xs uppercase tracking-widest text-stone-400';

interface Props {
  category?: AdminStoreCategoryRow | null;
}

export default function StoreCategoryForm({ category }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState('');

  return (
    <form
      className="max-w-xl space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError('');

        startTransition(async () => {
          const result = await saveStoreCategoryAction(category?.id ?? null, formData);
          if ('error' in result && result.error) {
            setError(result.error);
            return;
          }
          if ('id' in result) {
            router.push(`/admin/loja/categorias/${result.id}`);
            router.refresh();
          }
        });
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
            defaultValue={category?.name ?? ''}
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
            defaultValue={category?.slug ?? ''}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Descrição
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={category?.description ?? ''}
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
          className="inline-flex cursor-pointer items-center gap-2 rounded-sm bg-console px-5 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar categoria
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
