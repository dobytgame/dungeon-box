import { DASHBOARD_ROUTES } from '@/lib/dashboard/routes';

const SHIPPING_OPTIONS = [
  { value: '', label: 'Todos os envios' },
  { value: 'standalone', label: 'Avulso' },
  { value: 'bundled', label: 'Com assinatura' },
] as const;

interface Props {
  q?: string;
  status?: string;
  shipping?: string;
}

export default function StoreOrderSearchForm({ q, status, shipping }: Props) {
  return (
    <form
      action={DASHBOARD_ROUTES.orders}
      method="get"
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <label className="sr-only" htmlFor="store-order-search">
        Buscar pedidos
      </label>
      <input
        id="store-order-search"
        name="q"
        type="search"
        defaultValue={q ?? ''}
        placeholder="Buscar por produto, código ou rastreio"
        className="min-h-[44px] flex-1 rounded-sm border border-white/10 bg-stone-950 px-4 py-2.5 text-sm text-white placeholder:text-stone-600 focus:border-ember/40 focus:outline-none focus:ring-1 focus:ring-ember/30"
      />

      <label className="sr-only" htmlFor="store-order-shipping">
        Tipo de envio
      </label>
      <select
        id="store-order-shipping"
        name="shipping"
        defaultValue={shipping ?? ''}
        className="min-h-[44px] rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white"
      >
        {SHIPPING_OPTIONS.map((option) => (
          <option key={option.value || 'all'} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {status && status !== 'all' ? (
        <input type="hidden" name="status" value={status} />
      ) : null}

      <button
        type="submit"
        className="inline-flex min-h-[44px] items-center justify-center rounded-sm bg-ember px-5 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
      >
        Filtrar
      </button>
    </form>
  );
}
