import { ASAAS_CONFIGURED } from '@/lib/asaas/client';

export type StorePaymentMethod = 'credit_card' | 'pix';

/** Loja v1: sempre Asaas (cartão + PIX), independente do toggle de assinaturas. */
export const STORE_CHECKOUT_GATEWAY = 'asaas' as const;

export type StorePaymentConfig = {
  ready: boolean;
  provider: typeof STORE_CHECKOUT_GATEWAY;
  methods: StorePaymentMethod[];
  issue?: string;
};

/** Checkout da loja disponível quando o Asaas está configurado. */
export function isStorePaymentReady(): boolean {
  return ASAAS_CONFIGURED;
}

/** Valida se o checkout da loja pode cobrar via Asaas (cartão + PIX). */
export function getStorePaymentConfig(): StorePaymentConfig {
  if (!ASAAS_CONFIGURED) {
    return {
      ready: false,
      provider: STORE_CHECKOUT_GATEWAY,
      methods: [],
      issue: 'Asaas não configurado (ASAAS_API_KEY ausente).',
    };
  }

  return {
    ready: true,
    provider: STORE_CHECKOUT_GATEWAY,
    methods: ['credit_card', 'pix'],
  };
}
