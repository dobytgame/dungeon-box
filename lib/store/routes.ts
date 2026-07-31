export const STORE_ROUTES = {
  home: '/loja',
  product: (slug: string) => `/loja/produto/${slug}`,
  category: (slug: string) => `/loja/${slug}`,
  cart: '/loja/carrinho',
  checkout: '/loja/checkout',
  orderPayment: (orderId: string) => `/loja/pedido/${orderId}`,
  success: (orderId?: string) =>
    orderId ? `/loja/sucesso?order=${orderId}` : '/loja/sucesso',
} as const;
