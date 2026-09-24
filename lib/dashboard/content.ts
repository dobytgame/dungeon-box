import {
  DASHBOARD_NAV_GROUP_ORDER,
  type DashboardNavGroupId,
  type DashboardNavItem,
} from '@/lib/dashboard/constants';

export const DASHBOARD_NAV_GROUPS: Record<
  DashboardNavGroupId,
  { label: string; description: string }
> = {
  caixa: {
    label: 'Sua caixa',
    description: 'Assinatura, entregas e o tema do mês.',
  },
  loja: {
    label: 'Loja',
    description: 'Pedidos, kits extras e cobranças.',
  },
  mesa: {
    label: 'Sua mesa',
    description: 'Avaliações, fotos e recompensas.',
  },
  conta: {
    label: 'Conta',
    description: 'Dados pessoais e endereços da entrega.',
  },
};

export type DashboardNavGroup = {
  id: DashboardNavGroupId;
  label: string;
  description: string;
  items: DashboardNavItem[];
};

export function groupDashboardNav(items: DashboardNavItem[]): DashboardNavGroup[] {
  return DASHBOARD_NAV_GROUP_ORDER.map((id) => ({
    id,
    ...DASHBOARD_NAV_GROUPS[id],
    items: items.filter((item) => item.group === id),
  })).filter((group) => group.items.length > 0);
}
