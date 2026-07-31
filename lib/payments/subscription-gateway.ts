export type SubscriptionGateway =
  | 'asaas'
  | 'pagarme'
  | 'stripe'
  | 'mercadopago'
  | 'partner'
  | 'none';

export type SubscriptionGatewayRow = {
  is_partner?: boolean | null;
  asaas_subscription_id?: string | null;
  pagarme_subscription_id?: string | null;
  stripe_subscription_id?: string | null;
  mp_subscription_id?: string | null;
};

export function resolveSubscriptionGateway(
  sub: SubscriptionGatewayRow
): SubscriptionGateway {
  if (sub.is_partner) return 'partner';
  if (sub.pagarme_subscription_id) return 'pagarme';
  if (sub.asaas_subscription_id) return 'asaas';
  if (sub.stripe_subscription_id) return 'stripe';
  if (sub.mp_subscription_id) return 'mercadopago';
  return 'none';
}

export function subscriptionGatewayLabel(gateway: SubscriptionGateway): string {
  switch (gateway) {
    case 'asaas':
      return 'Asaas';
    case 'pagarme':
      return 'Pagar.me';
    case 'stripe':
      return 'Stripe';
    case 'mercadopago':
      return 'Mercado Pago';
    case 'partner':
      return 'Parceiro';
    default:
      return '—';
  }
}
