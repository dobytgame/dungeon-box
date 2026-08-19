import type { SupabaseClient } from '@supabase/supabase-js';

async function allocateUnusedCycleNumber(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<number | { error: string }> {
  const { data, error } = await admin
    .from('subscription_cycles')
    .select('cycle_number')
    .eq('subscription_id', subscriptionId);

  if (error) return { error: error.message };

  const used = new Set(
    (data ?? []).map((row) => row.cycle_number as number)
  );
  let candidate = 100_000;
  while (used.has(candidate)) candidate += 1;
  return candidate;
}

async function restoreCycleNumber(
  admin: SupabaseClient,
  cycleId: string,
  cycleNumber: number
) {
  await admin
    .from('subscription_cycles')
    .update({
      cycle_number: cycleNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cycleId);
}

/**
 * O card editado assume o número pedido. Se outro ciclo já tinha esse número,
 * ele é removido — não troca de lugar e não recria o número antigo.
 */
export async function reassignSubscriptionCycleNumber(
  admin: SupabaseClient,
  params: {
    subscriptionId: string;
    cycleId: string;
    fromNumber: number;
    toNumber: number;
    extraPatch?: Record<string, unknown>;
  }
): Promise<
  | { error: string }
  | { success: true; absorbedCycleId: string | null }
> {
  const now = new Date().toISOString();
  const patch = {
    cycle_number: params.toNumber,
    updated_at: now,
    ...params.extraPatch,
  };

  const { data: conflict } = await admin
    .from('subscription_cycles')
    .select('id')
    .eq('subscription_id', params.subscriptionId)
    .eq('cycle_number', params.toNumber)
    .neq('id', params.cycleId)
    .maybeSingle();

  if (!conflict?.id) {
    const { error } = await admin
      .from('subscription_cycles')
      .update(patch)
      .eq('id', params.cycleId)
      .eq('subscription_id', params.subscriptionId);

    if (error) return { error: error.message };

    await afterReassign(admin, params);
    return { success: true as const, absorbedCycleId: null };
  }

  const temp = await allocateUnusedCycleNumber(admin, params.subscriptionId);
  if (typeof temp !== 'number') return temp;

  const { error: parkError } = await admin
    .from('subscription_cycles')
    .update({ cycle_number: temp, updated_at: now })
    .eq('id', params.cycleId)
    .eq('subscription_id', params.subscriptionId);

  if (parkError) return { error: parkError.message };

  const { error: deleteError } = await admin
    .from('subscription_cycles')
    .delete()
    .eq('id', conflict.id)
    .eq('subscription_id', params.subscriptionId);

  if (deleteError) {
    await restoreCycleNumber(admin, params.cycleId, params.fromNumber);
    return { error: deleteError.message };
  }

  const { error: finishError } = await admin
    .from('subscription_cycles')
    .update(patch)
    .eq('id', params.cycleId)
    .eq('subscription_id', params.subscriptionId);

  if (finishError) {
    await restoreCycleNumber(admin, params.cycleId, params.fromNumber);
    return { error: finishError.message };
  }

  await afterReassign(admin, params);
  return { success: true as const, absorbedCycleId: conflict.id };
}

async function afterReassign(
  admin: SupabaseClient,
  params: {
    subscriptionId: string;
    cycleId: string;
    fromNumber: number;
    toNumber: number;
  }
) {
  await syncSubscriptionCurrentCycle(
    admin,
    params.subscriptionId,
    params.fromNumber,
    params.toNumber
  );

  if (params.fromNumber !== params.toNumber) {
    await deleteVacatedPlaceholderCycle(
      admin,
      params.subscriptionId,
      params.cycleId,
      params.fromNumber
    );
  }

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('billing_term')
    .eq('id', params.subscriptionId)
    .maybeSingle();

  const billingTerm = (subscription?.billing_term as string | null) ?? 'monthly';
  if (billingTerm !== 'monthly') return;

  await admin
    .from('subscription_cycles')
    .delete()
    .eq('subscription_id', params.subscriptionId)
    .neq('id', params.cycleId)
    .eq('status', 'upcoming')
    .is('payment_id', null);
}

async function deleteVacatedPlaceholderCycle(
  admin: SupabaseClient,
  subscriptionId: string,
  keepCycleId: string,
  vacatedNumber: number
) {
  await admin
    .from('subscription_cycles')
    .delete()
    .eq('subscription_id', subscriptionId)
    .eq('cycle_number', vacatedNumber)
    .neq('id', keepCycleId)
    .eq('status', 'upcoming')
    .is('payment_id', null);
}

async function syncSubscriptionCurrentCycle(
  admin: SupabaseClient,
  subscriptionId: string,
  fromNumber: number,
  toNumber: number
) {
  const { data: subscription } = await admin
    .from('subscriptions')
    .select('current_cycle')
    .eq('id', subscriptionId)
    .maybeSingle();

  const current = subscription?.current_cycle as number | null | undefined;
  if (current !== fromNumber) return;

  await admin
    .from('subscriptions')
    .update({
      current_cycle: toNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);
}
