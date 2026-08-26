import type { CycleShipmentItem } from '@/lib/admin/cycle-shipment-items';

const KIND_STYLES: Record<CycleShipmentItem['kind'], string> = {
  'paint-kit': 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  'monthly-kit': 'border-violet-500/30 bg-violet-500/10 text-violet-200',
  store: 'border-frost/30 bg-frost/10 text-frost',
};

interface Props {
  items: CycleShipmentItem[];
  compact?: boolean;
}

export default function CycleExtrasList({ items, compact = false }: Props) {
  if (items.length === 0) return null;

  return (
    <div className={compact ? 'space-y-3' : 'space-y-3 border-t border-white/5 pt-5'}>
      <p className="font-display text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">
        Extras neste envio
      </p>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={`${item.source}:${item.id}:${item.quantity}`}
            className="flex flex-wrap items-start justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="text-sm text-stone-200">
                {item.name}
                {item.quantity > 1 ? (
                  <span className="ml-1.5 text-xs text-stone-500">
                    ×{item.quantity}
                  </span>
                ) : null}
              </p>
              {item.detail ? (
                <p className="mt-0.5 text-xs text-stone-500">{item.detail}</p>
              ) : null}
            </div>
            <span
              className={`inline-flex items-center rounded border px-1.5 py-0.5 font-display text-[10px] uppercase tracking-[0.12em] ${KIND_STYLES[item.kind]}`}
            >
              {item.tag}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
