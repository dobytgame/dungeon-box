'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import {
  deleteStoreProductAction,
  saveStoreProductAction,
} from '@/lib/admin/actions';
import AdminHtmlEditor from '@/components/admin/AdminHtmlEditor';
import StoreProductMediaFields from '@/components/admin/StoreProductMediaFields';
import type { AdminStoreProductRow } from '@/lib/admin/store-products';
import { formatMoney } from '@/lib/dashboard/format';

const inputClass =
  'mt-2 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white';
const labelClass =
  'block font-display text-xs uppercase tracking-widest text-stone-400';

interface PlanOption {
  slug: string;
  name: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface Props {
  product?: AdminStoreProductRow | null;
  planOptions?: PlanOption[];
  categoryOptions?: CategoryOption[];
  defaultCategory?: 'paint-kit' | 'monthly-kit';
}

export default function StoreProductForm({
  product,
  planOptions = [],
  categoryOptions = [],
  defaultCategory = 'paint-kit',
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState(
    product?.category ?? defaultCategory
  );
  const isMonthlyKit = category === 'monthly-kit';

  return (
    <form
      className="max-w-3xl space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        formData.set('category', category);
        setError('');

        startTransition(async () => {
          const result = await saveStoreProductAction(product?.id ?? null, formData);
          if ('error' in result && result.error) {
            setError(result.error);
            return;
          }
          if ('id' in result) {
            router.push(`/admin/loja/${result.id}`);
            router.refresh();
          }
        });
      }}
    >
      <input type="hidden" name="category" value={category} />

      {!product ? (
        <div>
          <label htmlFor="category" className={labelClass}>
            Categoria
          </label>
          <select
            id="category"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as 'paint-kit' | 'monthly-kit')
            }
            className={inputClass}
          >
            <option value="paint-kit">Kit de pintura</option>
            <option value="monthly-kit">Kit avulso (plano)</option>
          </select>
        </div>
      ) : (
        <p className="text-sm text-stone-500">
          Categoria:{' '}
          <span className="text-stone-300">
            {isMonthlyKit ? 'Kit avulso' : 'Kit de pintura'}
          </span>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>
            Nome
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={product?.name ?? ''}
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
            readOnly={Boolean(product)}
            defaultValue={product?.slug ?? ''}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="tagline" className={labelClass}>
          Tagline
        </label>
        <input
          id="tagline"
          name="tagline"
          defaultValue={product?.tagline ?? ''}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="store_category_id" className={labelClass}>
          Categoria da loja
        </label>
        <select
          id="store_category_id"
          name="store_category_id"
          defaultValue={product?.store_category_id ?? ''}
          className={inputClass}
        >
          <option value="">Sem categoria</option>
          {categoryOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <StoreProductMediaFields
        imageUrl={product?.image_url ?? null}
        galleryUrls={product?.gallery_urls ?? []}
      />

      <AdminHtmlEditor defaultValue={product?.page_content_html} />

      {isMonthlyKit ? (
        <div>
          <label htmlFor="plan_slug" className={labelClass}>
            Plano vinculado
          </label>
          {product ? (
            <p className="mt-2 text-sm text-stone-300">
              {product.plan_name ?? product.plan_slug ?? '—'}
            </p>
          ) : (
            <select
              id="plan_slug"
              name="plan_slug"
              required
              className={inputClass}
              defaultValue=""
            >
              <option value="" disabled>
                Selecione o plano
              </option>
              {planOptions.map((plan) => (
                <option key={plan.slug} value={plan.slug}>
                  {plan.name}
                </option>
              ))}
            </select>
          )}
          <p className="mt-1 text-xs text-stone-500">
            O preço de venda na loja segue o plano (com promoções de assinante).
            O custo de produção usa o plano ou o valor abaixo, se preenchido.
          </p>
        </div>
      ) : (
        <div>
          <label htmlFor="paint_kit_bump_id" className={labelClass}>
            Tipo de kit
          </label>
          <select
            id="paint_kit_bump_id"
            name="paint_kit_bump_id"
            required
            defaultValue={product?.paint_kit_bump_id ?? ''}
            className={inputClass}
          >
            <option value="" disabled>
              Selecione
            </option>
            <option value="amador">Amador</option>
            <option value="profissional">Profissional</option>
          </select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="price_reais" className={labelClass}>
            Preço referência (R$)
          </label>
          <input
            id="price_reais"
            name="price_reais"
            required
            defaultValue={((product?.price_cents ?? 0) / 100).toFixed(2)}
            className={inputClass}
          />
          {isMonthlyKit ? (
            <p className="mt-1 text-xs text-stone-500">
              Referência administrativa — checkout usa preço do plano.
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="production_cost_reais" className={labelClass}>
            Custo de produção (R$)
          </label>
          <input
            id="production_cost_reais"
            name="production_cost_reais"
            required
            defaultValue={((product?.production_cost_cents ?? 0) / 100).toFixed(2)}
            className={inputClass}
          />
        </div>
      </div>

      {!isMonthlyKit ? (
        <div>
          <label htmlFor="includes" className={labelClass}>
            Itens inclusos (um por linha)
          </label>
          <textarea
            id="includes"
            name="includes"
            rows={5}
            defaultValue={product?.includes.join('\n') ?? ''}
            className={inputClass}
          />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="max_quantity" className={labelClass}>
            Quantidade máx. por pedido
          </label>
          <input
            id="max_quantity"
            name="max_quantity"
            type="number"
            defaultValue={product?.max_quantity ?? 9}
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
            defaultValue={product?.sort_order ?? 0}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={product?.featured}
            className="rounded border-white/20"
          />
          Destaque na loja
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={product?.is_active ?? true}
            className="rounded border-white/20"
          />
          Ativo na loja
        </label>
      </div>

      {product ? (
        <p className="text-xs text-stone-500">
          Preço atual: {formatMoney(product.price_cents)} · Custo:{' '}
          {formatMoney(product.production_cost_cents)}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex cursor-pointer items-center gap-2 rounded-sm bg-console px-5 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar produto
        </button>

        {product ? (
          <button
            type="button"
            disabled={deletePending || pending}
            onClick={() => {
              if (
                !window.confirm(
                  isMonthlyKit
                    ? 'Desativar este kit avulso na loja?'
                    : 'Excluir este produto permanentemente?'
                )
              ) {
                return;
              }
              setDeletePending(true);
              setError('');
              void deleteStoreProductAction(product.id).then((result) => {
                setDeletePending(false);
                if ('error' in result && result.error) {
                  setError(result.error);
                  return;
                }
                router.push('/admin/loja');
                router.refresh();
              });
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-red-500/30 bg-red-500/10 px-5 py-2.5 font-display text-xs uppercase tracking-widest text-red-300 disabled:opacity-50"
          >
            {deletePending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {isMonthlyKit ? 'Desativar' : 'Excluir'}
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
