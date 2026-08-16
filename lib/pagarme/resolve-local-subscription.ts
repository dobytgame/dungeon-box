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
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-one-time(?:-[a-z0-9]+)?$/i
  );
  if (oneTimeMatch?.[1]) return oneTimeMatch[1];

  const pixMatch = trimmed.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-pix(?:-[a-z0-9]+)?$/i
  );
  if (pixMatch?.[1]) return pixMatch[1];

  const comboMatch = trimmed.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-combo(?:-[a-z0-9]+)?$/i
  );
  if (comboMatch?.[1]) return comboMatch[1];

  return null;
}

export async function resolveLocalSubscriptionFromPagarmeCharge(
  supabase: SupabaseClient,
  charge: {
    id?: string | null;
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
    const byCode = await findLocalSubscriptionByPagarmeMetadata(
      supabase,
      codeSubscriptionId
    );
    if (byCode) return byCode;
  }

  const chargeId = charge.id?.trim();
  if (chargeId) {
    const { data: payment } = await supabase
      .from('payments')
      .select('subscription_id')
      .eq('pagarme_charge_id', chargeId)
      .maybeSingle();
    const paymentSubscriptionId = payment?.subscription_id as string | null;
    if (paymentSubscriptionId) {
      return findLocalSubscriptionByPagarmeMetadata(
        supabase,
        paymentSubscriptionId
      );
    }
  }

  return null;
}
