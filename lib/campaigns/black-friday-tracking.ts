import type { SupabaseClient } from '@supabase/supabase-js';
import {
  BLACK_FRIDAY_CAMPAIGN_CODE,
  type BlackFridayCtaPlacement,
  type BlackFridayOption,
} from '@/lib/campaigns/black-friday';

/** Registra abertura autenticada do checkout (funil da campanha). */
export async function recordBlackFridayCheckoutIntent(
  admin: SupabaseClient,
  input: {
    userId: string;
    option: BlackFridayOption;
    ctaPlacement: BlackFridayCtaPlacement;
  }
): Promise<void> {
  const { error } = await admin.from('campaign_checkout_intents').insert({
    campaign_code: BLACK_FRIDAY_CAMPAIGN_CODE,
    user_id: input.userId,
    cta_placement: input.ctaPlacement,
    billing_option: input.option,
  });
  if (error) {
    console.error('[black-friday] checkout intent:', error.message);
  }
}
