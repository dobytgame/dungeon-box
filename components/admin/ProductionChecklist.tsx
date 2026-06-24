import type { ProductionChecklistItem } from '@/lib/admin/cycle-shipment-items';

const KIND_STYLES: Record<
  ProductionChecklistItem['kind'],
  string
> = {
  subscription: 'border-console/40 bg-console/10 text-console',
  'paint-kit': 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  'monthly-kit': 'border-violet-500/30 bg-violet-500/10 text-violet-200',
  store: 'border-zinc-600 bg-zinc-900/60 text-zinc-300',
};

interface Props {
  items: ProductionChecklistItem[];
}

export default function ProductionChecklist({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="rounded border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
        Nenhum item identificado para este envio.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="flex gap-3 rounded border border-zinc-800/80 bg-zinc-950/50 p-3"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-zinc-900 font-mono text-xs tabular-nums text-zinc-400">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-zinc-100">{item.name}</p>
                {item.quantity > 1 ? (
                  <p className="font-mono text-xs text-zinc-500">Quantidade: {item.quantity}</p>
                ) : null}
                {item.detail ? (
                  <p className="mt-1 text-xs text-zinc-500">{item.detail}</p>
                ) : null}
              </div>
              <span
                className={`inline-flex shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${KIND_STYLES[item.kind]}`}
              >
                {item.tag}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
