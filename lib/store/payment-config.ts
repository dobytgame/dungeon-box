import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { getPaymentProvider } from '@/lib/payments/provider';

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

  // Loja sempre usa Asaas, independente do gateway de assinaturas.
  return {
    ready: true,
    provider: 'asaas',
    methods: ['credit_card', 'pix'],
  };
}
