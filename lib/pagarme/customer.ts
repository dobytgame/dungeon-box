import type { SupabaseClient } from '@supabase/supabase-js';
import { PagarmeApiError, pagarmeRequest } from '@/lib/pagarme/client';

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  cpf: string | null;
  phone: string | null;
  pagarme_customer_id: string | null;
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

type PagarmeCustomerResponse = {
  id: string;
};

function splitPhone(phone: string): {
  area_code: string;
  number: string;
} | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (digits.length === 10) {
    return { area_code: digits.slice(0, 2), number: digits.slice(2) };
  }
  if (digits.length === 11) {
    return { area_code: digits.slice(0, 2), number: digits.slice(2) };
  }
  return {
    area_code: digits.slice(digits.length - 11, digits.length - 9),
    number: digits.slice(digits.length - 9),
  };
}

async function pagarmeCustomerExists(customerId: string): Promise<boolean> {
  try {
    await pagarmeRequest<PagarmeCustomerResponse>(`/customers/${customerId}`);
    return true;
  } catch (error) {
    if (error instanceof PagarmeApiError && error.status === 404) {
      return false;
    }
    throw error;
  }
}

async function clearStoredPagarmeCustomerId(
  supabase: SupabaseClient,
  profileId: string
) {
  await supabase
    .from('profiles')
    .update({
      pagarme_customer_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId);
}

export async function getOrCreatePagarmeCustomer(
  supabase: SupabaseClient,
  profile: ProfileRow,
  address: AddressRow
): Promise<string> {
  if (profile.pagarme_customer_id) {
    const exists = await pagarmeCustomerExists(profile.pagarme_customer_id);
    if (exists) return profile.pagarme_customer_id;
    await clearStoredPagarmeCustomerId(supabase, profile.id);
  }

  const cpf = profile.cpf?.replace(/\D/g, '') ?? '';
  const phone = profile.phone?.replace(/\D/g, '') ?? '';
  const phoneParts = splitPhone(phone);

  const customer = await pagarmeRequest<PagarmeCustomerResponse>('/customers', {
    method: 'POST',
    body: {
      name: profile.full_name?.trim() || address.recipient,
      email: profile.email,
      type: 'individual',
      document: cpf,
      document_type: 'CPF',
      code: profile.id,
      phones: phoneParts
        ? {
            mobile_phone: {
              country_code: '55',
              area_code: phoneParts.area_code,
              number: phoneParts.number,
            },
          }
        : undefined,
      address: {
        line_1: `${address.number}, ${address.street}, ${address.neighborhood}`,
        line_2: address.complement ?? undefined,
        zip_code: address.zip_code.replace(/\D/g, ''),
        city: address.city,
        state: address.state,
        country: 'BR',
      },
    },
  });

  await supabase
    .from('profiles')
    .update({
      pagarme_customer_id: customer.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id);

  return customer.id;
}
