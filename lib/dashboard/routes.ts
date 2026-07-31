export const DASHBOARD_ROUTES = {
  orders: '/dashboard/pedidos',
  order: (orderId: string) => `/dashboard/pedidos/${orderId}`,
} as const;
