import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LocalPagarmeSubscription = {
  id: string;
  user_id: string;
  status: string;
  pagarme_subscription_id: string | null;
  current_cycle: number;
};

export async function findLocalSubscriptionByPagarmeId(
  supabase: SupabaseClient,
  pagarmeSubscriptionId: string
): Promise<LocalPagarmeSubscription | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('id, user_id, status, pagarme_subscription_id, current_cycle')
    .eq('pagarme_subscription_id', pagarmeSubscriptionId)
    .maybeSingle();

  return data;
}

export async function findLocalSubscriptionByPagarmeMetadata(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<LocalPagarmeSubscription | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('id, user_id, status, pagarme_subscription_id, current_cycle')
    .eq('id', subscriptionId)
    .maybeSingle();

  return data;
}

/** `{subscriptionId}-01`, `{subscriptionId}-one-time`, etc. */
export function parsePagarmeSubscriptionChargeCode(
  code?: string | null
): string | null {
  const trimmed = code?.trim() ?? '';
  if (!trimmed) return null;

  const cycleMatch = trimmed.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-\d+$/i
  );
  if (cycleMatch?.[1]) return cycleMatch[1];

  const oneTimeMatch = trimmed.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-one-time$/i
  );
  if (oneTimeMatch?.[1]) return oneTimeMatch[1];

  const comboMatch = trimmed.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-combo$/i
  );
  if (comboMatch?.[1]) return comboMatch[1];

  return null;
}

export async function resolveLocalSubscriptionFromPagarmeCharge(
  supabase: SupabaseClient,
  charge: {
    subscription_id?: string | null;
    code?: string | null;
    metadata?: Record<string, string> | null;
  }
): Promise<LocalPagarmeSubscription | null> {
  const pagarmeSubscriptionId = charge.subscription_id?.trim();
  if (pagarmeSubscriptionId) {
    const byPagarmeId = await findLocalSubscriptionByPagarmeId(
      supabase,
      pagarmeSubscriptionId
    );
    if (byPagarmeId) return byPagarmeId;
  }

  const metadataSubscriptionId = charge.metadata?.subscription_id?.trim();
  if (metadataSubscriptionId && UUID_RE.test(metadataSubscriptionId)) {
    const byMetadata = await findLocalSubscriptionByPagarmeMetadata(
      supabase,
      metadataSubscriptionId
    );
    if (byMetadata) return byMetadata;
  }

  const codeSubscriptionId = parsePagarmeSubscriptionChargeCode(charge.code);
  if (codeSubscriptionId) {
    return findLocalSubscriptionByPagarmeMetadata(supabase, codeSubscriptionId);
  }

  return null;
}
