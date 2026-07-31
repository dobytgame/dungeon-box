import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PaymentProvider } from '@/lib/payments/provider';

export type CheckoutGateway = Extract<PaymentProvider, 'asaas' | 'pagarme'>;

export async function readActiveGatewayFromDb(
  admin?: SupabaseClient
): Promise<CheckoutGateway | null> {
  const client = admin ?? createAdminClient();

  const { data, error } = await client
    .from('gateway_config')
    .select('active_gateway')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[gateway-config] read failed:', error.message);
    return null;
  }

  const gateway = data?.active_gateway?.trim().toLowerCase();
  if (gateway === 'asaas' || gateway === 'pagarme') {
    return gateway;
  }

  return null;
}
