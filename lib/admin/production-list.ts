import type { AdminCycleRow } from '@/lib/admin/types';
import type { ProductionKanbanBoard } from '@/lib/admin/queries';
import { formatZip } from '@/lib/dashboard/format';

export type ProductionBoardColumn = keyof ProductionKanbanBoard;

export const PRODUCTION_BOARD_COLUMNS: ProductionBoardColumn[] = [
  'upcoming',
  'production',
  'preparing',
  'shipped',
  'delivered',
];

export const PRODUCTION_SECTION_META: Record<
  ProductionBoardColumn,
  { label: string; hint: string }
> = {
  upcoming: {
    label: 'Aguardando',
    hint: 'Pagamento confirmado — fila por ordem de compra',
  },
  production: {
    label: 'Produção',
    hint: 'Peças sendo impressas e preparadas',
  },
  preparing: {
    label: 'Em preparo',
    hint: 'Caixa sendo montada no estoque',
  },
  shipped: {
    label: 'Enviado',
    hint: 'Em trânsito com rastreio',
  },
  delivered: {
    label: 'Entregue',
    hint: 'Entrega confirmada',
  },
};

type AddressFields = {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  recipient?: string | null;
};

export function formatProductionShippingAddress(
  address: AddressFields | null | undefined
): string | null {
  if (!address?.street || !address.number) return null;

  const zip = formatZip(address.zip_code);
  const parts = [
    address.recipient?.trim() || null,
    `${address.street}, ${address.number}`,
    address.complement?.trim() || null,
    address.neighborhood?.trim() || null,
    address.city && address.state ? `${address.city}/${address.state}` : null,
    zip !== '—' ? `CEP ${zip}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : null;
}

export function formatProductionProductLabel(row: AdminCycleRow): string {
  const plan = row.planName ?? 'Plano';
  const theme = row.themeName ? ` · ${row.themeName}` : '';
  const cycle = ` · Ciclo #${row.cycle_number}`;

  if (row.extraItems.length > 0) {
    const extras = row.extraItems
      .map((item) => item.name)
      .slice(0, 2)
      .join(', ');
    const suffix =
      row.extraItems.length > 2 ? ` +${row.extraItems.length - 2}` : '';
    return `${plan}${theme}${cycle} · +${extras}${suffix}`;
  }

  return `${plan}${theme}${cycle}`;
}
