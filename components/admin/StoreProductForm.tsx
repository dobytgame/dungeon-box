'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import {
  deleteStoreProductAction,
  saveStoreProductAction,
} from '@/lib/admin/actions';
import AdminHtmlEditor from '@/components/admin/AdminHtmlEditor';
import StoreProductMediaFields from '@/components/admin/StoreProductMediaFields';
import StoreProductVariationsFields from '@/components/admin/StoreProductVariationsFields';
import type { AdminStoreProductRow } from '@/lib/admin/store-products';
import { formatMoney } from '@/lib/dashboard/format';
import { generateSeoSlug } from '@/lib/seo/slug';
import {
  STORE_PRODUCT_CATEGORY_LABELS,
  type StoreProductCategory,
} from '@/lib/store/catalog';
import { SUBSCRIBER_STORE_DISCOUNT_PERCENT } from '@/lib/store/subscriber-discount';

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
  depth: number;
  parentName?: string | null;
}

interface Props {
  product?: AdminStoreProductRow | null;
  planOptions?: PlanOption[];
  categoryOptions?: CategoryOption[];
  defaultCategory?: StoreProductCategory;
}

export default function StoreProductForm({
  product,
  planOptions = [],
  categoryOptions = [],
  defaultCategory = 'store-item',
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState(
    product?.category ?? defaultCategory
  );
  const [storeCategoryId, setStoreCategoryId] = useState(
    product?.store_category_id ?? ''
  );
  const isMonthlyKit = category === 'monthly-kit';
  const isPaintKit = category === 'paint-kit';
  const isStoreItem = category === 'store-item';
  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(Boolean(product?.slug));
  const saveModeRef = useRef<'edit' | 'create-another'>('edit');

  function submitForm(formData: FormData) {
    formData.set('category', category);
    setError('');

    startTransition(async () => {
      const result = await saveStoreProductAction(product?.id ?? null, formData);
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      if ('id' in result) {
        if (saveModeRef.current === 'create-another') {
          router.push('/admin/loja/novo');
        } else {
          router.push(`/admin/loja/${result.id}`);
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
      <input type="hidden" name="category" value={category} />

      <div className="rounded-sm border border-console/20 bg-console/5 p-4">
        <label htmlFor="store_category_id" className={labelClass}>
          Categoria da vitrine
        </label>
        <p className="mt-1 text-xs text-stone-500">
          Onde o produto aparece no menu e nas páginas da loja. Use as
          categorias que você cadastrou em Loja → Categorias.
        </p>
        <select
          id="store_category_id"
          name="store_category_id"
          value={storeCategoryId}
          onChange={(event) => setStoreCategoryId(event.target.value)}
          className={inputClass}
        >
          <option value="">Sem categoria</option>
          {categoryOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {`${'  '.repeat(option.depth)}${option.depth > 0 ? '↳ ' : ''}${option.name}`}
            </option>
          ))}
        </select>
        {categoryOptions.length === 0 ? (
          <p className="mt-2 text-xs text-amber-300/80">
            Nenhuma categoria cadastrada.{' '}
            <a href="/admin/loja/categorias/novo" className="text-console underline">
              Criar categoria
            </a>
          </p>
        ) : null}
      </div>

      {!product ? (
        <div>
          <label htmlFor="category" className={labelClass}>
            Tipo de produto
          </label>
          <p className="mt-1 text-xs text-stone-500">
            {isStoreItem
              ? 'Acessórios, cenários e demais itens avulsos com frete calculado no checkout.'
              : isMonthlyKit
                ? 'Cópia extra do kit do mês, vinculada a um plano de assinatura.'
                : 'Kit de pintura recorrente vinculado ao tipo amador ou profissional.'}
          </p>
          <select
            id="category"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as StoreProductCategory)
            }
            className={inputClass}
          >
            {(Object.keys(STORE_PRODUCT_CATEGORY_LABELS) as StoreProductCategory[]).map(
              (value) => (
                <option key={value} value={value}>
                  {STORE_PRODUCT_CATEGORY_LABELS[value]}
                </option>
              )
            )}
          </select>
        </div>
      ) : (
        <p className="text-sm text-stone-500">
          Tipo de produto:{' '}
          <span className="text-stone-300">
            {STORE_PRODUCT_CATEGORY_LABELS[category]}
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
            value={name}
            onChange={(event) => {
              const nextName = event.target.value;
              setName(nextName);
              if (!product && !slugEdited) {
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
            readOnly={Boolean(product)}
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value);
            }}
            className={inputClass}
          />
          {!product && slug ? (
            <p className="mt-1 text-xs text-stone-500">
              URL: /loja/produto/{slug}
            </p>
          ) : null}
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
            <>
              <p className="mt-2 text-sm text-stone-300">
                {product.plan_name ?? product.plan_slug ?? '—'}
              </p>
              {product.plan_slug ? (
                <input type="hidden" name="plan_slug" value={product.plan_slug} />
              ) : null}
            </>
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
      ) : isPaintKit ? (
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
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="price_reais" className={labelClass}>
            {isMonthlyKit ? 'Preço na loja (R$)' : 'Preço referência (R$)'}
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
              Valor cobrado na loja para este kit. Independente do preço da
              assinatura em Planos.
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

      <div>
        <label htmlFor="subscriber_discount_percent" className={labelClass}>
          Desconto para assinantes (%)
        </label>
        <input
          id="subscriber_discount_percent"
          name="subscriber_discount_percent"
          type="number"
          min={0}
          max={100}
          step={1}
          placeholder={String(SUBSCRIBER_STORE_DISCOUNT_PERCENT)}
          defaultValue={
            product?.subscriber_discount_percent != null
              ? product.subscriber_discount_percent
              : ''
          }
          className={inputClass}
        />
        <p className="mt-1 text-xs text-stone-500">
          Deixe em branco para usar o padrão de {SUBSCRIBER_STORE_DISCOUNT_PERCENT}%
          para assinantes ativos. Use 0 para desativar o desconto neste produto.
        </p>
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

      {isStoreItem ? (
        <StoreProductVariationsFields
          enabled={product?.variations_enabled ?? false}
          variations={product?.variations ?? []}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="min_quantity" className={labelClass}>
            Quantidade mín. por pedido
          </label>
          <input
            id="min_quantity"
            name="min_quantity"
            type="number"
            min={1}
            defaultValue={product?.min_quantity ?? 1}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="max_quantity" className={labelClass}>
            Quantidade máx. por pedido
          </label>
          <input
            id="max_quantity"
            name="max_quantity"
            type="number"
            min={1}
            defaultValue={product?.max_quantity ?? 9}
            className={inputClass}
          />
        </div>
      </div>

      {isStoreItem ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-white/10 bg-stone-950/40 p-4">
          <input
            type="checkbox"
            name="requires_unit_uploads"
            defaultChecked={product?.requires_unit_uploads ?? false}
            className="mt-1"
          />
          <span>
            <span className="block font-display text-xs uppercase tracking-widest text-stone-300">
              Produto personalizado
            </span>
            <span className="mt-1 block text-xs text-stone-500">
              Exige 1 imagem por unidade na página do produto (mín. 5 itens
              recomendado). A vitrine usa a mesma URL; só a experiência de compra muda.
            </span>
          </span>
        </label>
      ) : null}

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
          onClick={() => {
            saveModeRef.current = 'edit';
          }}
          className="inline-flex cursor-pointer items-center gap-2 rounded-sm bg-console px-5 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar produto
        </button>

        <button
          type="submit"
          disabled={pending}
          onClick={() => {
            saveModeRef.current = 'create-another';
          }}
          className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-white/10 px-5 py-2.5 font-display text-xs uppercase tracking-widest text-stone-300 transition hover:border-console/40 hover:text-console disabled:opacity-50"
        >
          Salvar e criar outro
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
