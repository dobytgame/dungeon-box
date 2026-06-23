import type { CycleShipmentItem } from '@/lib/admin/cycle-shipment-items';

const KIND_STYLES = {
  'paint-kit':
    'border-amber-500/30 bg-amber-500/10 text-amber-200',
  'monthly-kit':
    'border-violet-500/30 bg-violet-500/10 text-violet-200',
  store: 'border-console/30 bg-console/10 text-console',
} as const;

interface Props {
  items: CycleShipmentItem[];
  tags?: Array<{ tag: string; kind: CycleShipmentItem['kind'] }>;
  compact?: boolean;
}

export default function CycleBundledTags({ items, tags, compact = false }: Props) {
  const tagEntries =
    tags ??
    items.map((item) => ({
      tag: item.tag,
      kind: item.kind,
    }));

  if (tagEntries.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'mt-2'}`}>
      {tagEntries.map(({ tag, kind }) => (
        <span
          key={tag}
          className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${KIND_STYLES[kind]}`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export function CycleBundledItemsList({ items }: { items: CycleShipmentItem[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={`${item.source}:${item.id}:${item.quantity}`}
          className="flex flex-wrap items-start justify-between gap-2 text-sm"
        >
          <div>
            <span className="text-zinc-100">{item.name}</span>
            {item.quantity > 1 ? (
              <span className="ml-1.5 font-mono text-xs text-zinc-500">
                ×{item.quantity}
              </span>
            ) : null}
            {item.detail ? (
              <span className="mt-0.5 block text-xs text-zinc-500">{item.detail}</span>
            ) : null}
          </div>
          <CycleBundledTags items={[item]} compact />
        </li>
      ))}
    </ul>
  );
}
