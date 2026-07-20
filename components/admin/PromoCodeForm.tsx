'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { PLAN_SLUGS } from '@/lib/checkout/plans';
import { savePromoCodeAction } from '@/lib/admin/actions';
import type { AdminPromoCodeRow } from '@/lib/admin/types';

const inputClass =
  'mt-2 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white';
const labelClass =
  'block font-display text-xs uppercase tracking-widest text-stone-400';

interface Props {
  promo?: AdminPromoCodeRow | null;
}

function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function PromoCodeForm({ promo }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [discountType, setDiscountType] = useState(
    promo?.discount_type ?? 'percent'
  );
  const [appliesTo, setAppliesTo] = useState(
    promo?.applies_to ?? 'subscription'
  );
  const isFreeShipping = discountType === 'free_shipping';

  return (
    <form
      className="max-w-2xl space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError('');
        startTransition(async () => {
          const result = await savePromoCodeAction(promo?.id ?? null, formData);
          if ('error' in result && result.error) {
            setError(result.error);
            return;
          }
          if ('id' in result) {
            router.push(`/admin/cupons/${result.id}`);
            router.refresh();
          }
        });
      }}
    >
      <div>
        <label htmlFor="code" className={labelClass}>
          Código
        </label>
        <input
          id="code"
          name="code"
          required
          defaultValue={promo?.code ?? ''}
          className={`${inputClass} uppercase`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="discount_type" className={labelClass}>
            Tipo
          </label>
          <select
            id="discount_type"
            name="discount_type"
            value={discountType}
            onChange={(event) =>
              setDiscountType(
                event.target.value as AdminPromoCodeRow['discount_type']
              )
            }
            className={inputClass}
          >
            <option value="percent">Percentual (%)</option>
            <option value="fixed">Valor fixo (centavos)</option>
            <option value="free_shipping">Frete grátis</option>
          </select>
        </div>
        <div>
          <label htmlFor="discount_value" className={labelClass}>
            Valor
          </label>
          {isFreeShipping ? (
            <input type="hidden" name="discount_value" value="0" />
          ) : (
            <input
              id="discount_value"
              name="discount_value"
              type="number"
              min={1}
              required
              defaultValue={promo?.discount_value ?? 10}
              className={inputClass}
            />
          )}
          {isFreeShipping ? (
            <p className="mt-2 text-xs text-stone-500">
              {appliesTo === 'store'
                ? 'O cupom isenta o frete avulso da loja — o valor dos produtos não muda.'
                : 'O valor da assinatura não muda — o cupom isenta o frete em todos os meses.'}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="applies_to" className={labelClass}>
          Onde vale
        </label>
        <select
          id="applies_to"
          name="applies_to"
          value={appliesTo}
          onChange={(event) =>
            setAppliesTo(
              event.target.value as AdminPromoCodeRow['applies_to']
            )
          }
          className={inputClass}
        >
          <option value="subscription">Assinatura (checkout)</option>
          <option value="store">Loja</option>
          <option value="both">Assinatura e loja</option>
        </select>
      </div>

      {!isFreeShipping ? (
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            name="includes_free_shipping"
            defaultChecked={promo?.includes_free_shipping ?? false}
            className="rounded border-white/20"
          />
          Incluir frete grátis recorrente
        </label>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="max_redemptions" className={labelClass}>
            Limite de usos
          </label>
          <input
            id="max_redemptions"
            name="max_redemptions"
            type="number"
            min={1}
            placeholder="Ilimitado"
            defaultValue={promo?.max_redemptions ?? ''}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="expires_at" className={labelClass}>
            Expira em
          </label>
          <input
            id="expires_at"
            name="expires_at"
            type="datetime-local"
            defaultValue={toDatetimeLocal(promo?.expires_at)}
            className={inputClass}
          />
        </div>
      </div>

      {appliesTo !== 'store' ? (
        <div>
          <label htmlFor="plan_slugs" className={labelClass}>
            Planos elegíveis
          </label>
          <input
            id="plan_slugs"
            name="plan_slugs"
            placeholder={`Vazio = todos. Ex: ${PLAN_SLUGS.join(', ')}`}
            defaultValue={promo?.plan_slugs?.join(', ') ?? ''}
            className={inputClass}
          />
          {appliesTo === 'both' ? (
            <p className="mt-2 text-xs text-stone-500">
              Restrição de plano vale só no checkout de assinatura.
            </p>
          ) : null}
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-stone-300">
        <input
          type="checkbox"
          name="active"
          defaultChecked={promo?.active ?? true}
          className="rounded border-white/20"
        />
        Cupom ativo
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex cursor-pointer items-center gap-2 rounded-sm bg-console px-5 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Salvar cupom
      </button>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
