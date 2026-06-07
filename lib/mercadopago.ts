/**
 * Cliente Mercado Pago — ativado na Fase 3.
 * Instalar: npm install mercadopago
 */
export const MP_CONFIGURED = Boolean(process.env.MP_ACCESS_TOKEN);

export function assertMpConfigured() {
  if (!MP_CONFIGURED) {
    throw new Error('Mercado Pago não configurado (MP_ACCESS_TOKEN).');
  }
}
