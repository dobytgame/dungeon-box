import type { SupabaseClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe/server';

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  cpf: string | null;
  stripe_customer_id: string | null;
};

export async function getOrCreateStripeCustomer(
  supabase: SupabaseClient,
  profile: ProfileRow
): Promise<string> {
  if (profile.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: profile.email,
    name: profile.full_name ?? undefined,
    metadata: {
      dungeonbox_user_id: profile.id,
      cpf: profile.cpf?.replace(/\D/g, '') ?? '',
    },
  });

  await supabase
    .from('profiles')
    .update({
      stripe_customer_id: customer.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id);

  return customer.id;
}
