'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { updatePlanCommercialAction } from '@/lib/admin/actions';
import type { AdminPlanRow } from '@/lib/admin/types';

const inputClass =
  'mt-2 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white';
const labelClass =
  'block font-display text-xs uppercase tracking-widest text-stone-400';

interface Props {
  plan: AdminPlanRow;
}

export default function PlanCommercialForm({ plan }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <form
      className="max-w-2xl space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const priceReais = Number.parseFloat(
          (formData.get('price_reais') as string)?.replace(',', '.') ?? ''
        );
        if (Number.isNaN(priceReais)) {
          setError('Preço inválido.');
          return;
        }
        formData.set('price_cents', String(Math.round(priceReais * 100)));

        setError('');
        setMessage('');
        startTransition(async () => {
          const result = await updatePlanCommercialAction(plan.id, formData);
          if ('error' in result && result.error) {
            setError(result.error);
            return;
          }
          setMessage('Plano atualizado.');
        });
      }}
    >
      <p className="text-sm text-stone-500">
        Slug: <span className="font-mono text-stone-300">{plan.slug}</span>
      </p>

      <div>
        <label htmlFor="name" className={labelClass}>
          Nome comercial
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={plan.name}
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
          defaultValue={plan.description ?? ''}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="price_reais" className={labelClass}>
            Preço (R$)
          </label>
          <input
            id="price_reais"
            name="price_reais"
            required
            defaultValue={(plan.price_cents / 100).toFixed(2)}
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
            defaultValue={plan.sort_order}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="pieces_min" className={labelClass}>
            Peças mín.
          </label>
          <input
            id="pieces_min"
            name="pieces_min"
            type="number"
            defaultValue={plan.pieces_min}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="pieces_max" className={labelClass}>
            Peças máx.
          </label>
          <input
            id="pieces_max"
            name="pieces_max"
            type="number"
            defaultValue={plan.pieces_max}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="color_choices" className={labelClass}>
            Escolhas de cor
          </label>
          <input
            id="color_choices"
            name="color_choices"
            type="number"
            defaultValue={plan.color_choices}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="store_discount" className={labelClass}>
            Desconto loja (%)
          </label>
          <input
            id="store_discount"
            name="store_discount"
            type="number"
            defaultValue={plan.store_discount}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="accent_color" className={labelClass}>
            Cor de destaque
          </label>
          <input
            id="accent_color"
            name="accent_color"
            defaultValue={plan.accent_color ?? ''}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="freight_regions" className={labelClass}>
          Regiões frete grátis
        </label>
        <input
          id="freight_regions"
          name="freight_regions"
          placeholder="sul, sudeste ou all"
          defaultValue={plan.freight_regions?.join(', ') ?? ''}
          className={inputClass}
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            name="freight_free"
            defaultChecked={plan.freight_free}
            className="rounded border-white/20"
          />
          Frete grátis
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            name="has_vip_group"
            defaultChecked={plan.has_vip_group}
            className="rounded border-white/20"
          />
          Grupo VIP
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            name="has_vote"
            defaultChecked={plan.has_vote}
            className="rounded border-white/20"
          />
          Voto em temas
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={plan.is_active}
            className="rounded border-white/20"
          />
          Plano ativo no checkout
        </label>
      </div>

      <p className="rounded-sm border border-amber-400/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
        Alterar preço aqui não atualiza assinaturas já ativas no Asaas — só novos
        checkouts e upgrades futuros.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex cursor-pointer items-center gap-2 rounded-sm bg-console px-5 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Salvar plano
      </button>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-300" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
