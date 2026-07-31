import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { PAGARME_CONFIGURED } from '@/lib/pagarme/client';
import { PAGARME_TOKENIZATION_READY } from '@/lib/pagarme/public';
import {
  getActivePaymentProvider,
  type PaymentProvider,
} from '@/lib/payments/provider';

export type StorePaymentMethod = 'credit_card' | 'pix';

export type StoreCheckoutGateway = Extract<PaymentProvider, 'asaas' | 'pagarme'>;

export type StorePaymentConfig = {
  ready: boolean;
  provider: StoreCheckoutGateway;
  methods: StorePaymentMethod[];
  issue?: string;
};

function gatewayReady(gateway: StoreCheckoutGateway): boolean {
  if (gateway === 'pagarme') {
    return PAGARME_CONFIGURED && PAGARME_TOKENIZATION_READY;
  }
  return ASAAS_CONFIGURED;
}

function gatewayIssue(gateway: StoreCheckoutGateway): string {
  if (gateway === 'pagarme') {
    if (!PAGARME_CONFIGURED) {
      return 'Pagar.me não configurado (PAGARME_SECRET_KEY ausente).';
    }
    if (!PAGARME_TOKENIZATION_READY) {
      return 'Pagar.me incompleto (NEXT_PUBLIC_PAGARME_PUBLIC_KEY ausente).';
    }
  }
  return 'Asaas não configurado (ASAAS_API_KEY ausente).';
}

/** Checkout da loja segue o mesmo gateway ativo das assinaturas (admin). */
export async function getStorePaymentConfig(): Promise<StorePaymentConfig> {
  const active = await getActivePaymentProvider();
  const provider: StoreCheckoutGateway =
    active === 'pagarme' ? 'pagarme' : 'asaas';

  if (!gatewayReady(provider)) {
    return {
      ready: false,
      provider,
      methods: [],
      issue: gatewayIssue(provider),
    };
  }

  return {
    ready: true,
    provider,
    methods: ['credit_card', 'pix'],
  };
}

export async function isStorePaymentReady(): Promise<boolean> {
  const config = await getStorePaymentConfig();
  return config.ready;
}
