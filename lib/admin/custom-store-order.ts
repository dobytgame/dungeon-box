import type { SupabaseClient } from '@supabase/supabase-js';
import { formatProductionShippingAddress } from '@/lib/admin/production-list';

export type CustomOrderCustomerAddress = {
  id: string;
  label: string;
  isDefault: boolean;
};

export type CustomOrderCustomer = {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  addresses: CustomOrderCustomerAddress[];
};

function formatAddressLabel(address: {
  recipient?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
}): string {
  return (
    formatProductionShippingAddress(address) ??
    [address.street, address.number, address.city, address.state]
      .filter(Boolean)
      .join(', ')
  );
}

export async function getCustomOrderCustomer(
  admin: SupabaseClient,
  userId: string
): Promise<CustomOrderCustomer | null> {
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, full_name, display_name, cpf, phone')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.email) return null;

  const { data: addresses } = await admin
    .from('addresses')
    .select(
      'id, recipient, street, number, complement, neighborhood, city, state, zip_code, is_default'
    )
    .eq('user_id', userId)
    .order('is_default', { ascending: false });

  return {
    id: profile.id as string,
    name:
      (profile.full_name as string | null) ??
      (profile.display_name as string | null) ??
      (profile.email as string),
    email: profile.email as string,
    cpf: (profile.cpf as string | null) ?? null,
    phone: (profile.phone as string | null) ?? null,
    addresses: (addresses ?? []).map((address) => ({
      id: address.id as string,
      isDefault: Boolean(address.is_default),
      label: formatAddressLabel(address),
    })),
  };
}

export async function searchCustomOrderCustomers(
  admin: SupabaseClient,
  query: string
): Promise<Array<Pick<CustomOrderCustomer, 'id' | 'name' | 'email'>>> {
  const safe = query.replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (safe.length < 2) return [];

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, full_name, display_name')
    .or(
      `email.ilike.%${safe}%,full_name.ilike.%${safe}%,display_name.ilike.%${safe}%,cpf.ilike.%${safe}%`
    )
    .order('created_at', { ascending: false })
    .limit(12);

  return (profiles ?? [])
    .filter((profile) => Boolean(profile.email))
    .map((profile) => ({
      id: profile.id as string,
      email: profile.email as string,
      name:
        (profile.full_name as string | null) ??
        (profile.display_name as string | null) ??
        (profile.email as string),
    }));
}
