import type { SupabaseClient } from '@supabase/supabase-js';
import { asaasRequest, AsaasApiError } from '@/lib/asaas/client';

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  cpf: string | null;
  phone: string | null;
  asaas_customer_id: string | null;
};

type AddressRow = {
  recipient: string;
  zip_code: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
};

type AsaasCustomerResponse = {
  id: string;
};

async function asaasCustomerExists(customerId: string): Promise<boolean> {
  try {
    await asaasRequest<AsaasCustomerResponse>(`/customers/${customerId}`);
    return true;
  } catch (error) {
    if (error instanceof AsaasApiError) {
      const invalid =
        error.status === 404 ||
        error.errors.some((item) => item.code === 'invalid_customer');
      if (invalid) return false;
    }
    throw error;
  }
}

async function clearStoredAsaasCustomerId(
  supabase: SupabaseClient,
  profileId: string
) {
  await supabase
    .from('profiles')
    .update({
      asaas_customer_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId);
}

export async function getOrCreateAsaasCustomer(
  supabase: SupabaseClient,
  profile: ProfileRow,
  address: AddressRow
): Promise<string> {
  if (profile.asaas_customer_id) {
    const exists = await asaasCustomerExists(profile.asaas_customer_id);
    if (exists) {
      return profile.asaas_customer_id;
    }

    await clearStoredAsaasCustomerId(supabase, profile.id);
  }

  const cpf = profile.cpf?.replace(/\D/g, '') ?? '';
  const phone = profile.phone?.replace(/\D/g, '') ?? '';

  const customer = await asaasRequest<AsaasCustomerResponse>('/customers', {
    method: 'POST',
    body: {
      name: profile.full_name?.trim() || address.recipient,
      email: profile.email,
      cpfCnpj: cpf,
      phone: phone || undefined,
      mobilePhone: phone || undefined,
      postalCode: address.zip_code.replace(/\D/g, ''),
      address: address.street,
      addressNumber: address.number,
      complement: address.complement ?? undefined,
      province: address.neighborhood,
      externalReference: profile.id,
      notificationDisabled: false,
    },
  });

  await supabase
    .from('profiles')
    .update({
      asaas_customer_id: customer.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id);

  return customer.id;
}
