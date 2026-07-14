import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { getPaymentProvider, isAsaasCheckout } from '@/lib/payments/provider';

export type StorePaymentMethod = 'credit_card' | 'pix';

export type StorePaymentConfig = {
  ready: boolean;
  provider: ReturnType<typeof getPaymentProvider>;
  methods: StorePaymentMethod[];
  issue?: string;
};

/** Valida se o checkout da loja pode cobrar via Asaas (cartão + PIX). */
export function getStorePaymentConfig(): StorePaymentConfig {
  const provider = getPaymentProvider();

  if (!ASAAS_CONFIGURED) {
    return {
      ready: false,
      provider,
      methods: [],
      issue: 'Asaas não configurado (ASAAS_API_KEY ausente).',
    };
  }

  if (!isAsaasCheckout()) {
    return {
      ready: false,
      provider,
      methods: [],
      issue:
        provider === 'stripe'
          ? 'A loja usa pagamento via Asaas. Ajuste PAYMENT_PROVIDER=asaas.'
          : 'Nenhum provedor de pagamento ativo para a loja.',
    };
  }

  return {
    ready: true,
    provider: 'asaas',
    methods: ['credit_card', 'pix'],
  };
}
