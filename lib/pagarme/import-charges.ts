import type { SupabaseClient } from '@supabase/supabase-js';
import { pagarmeRequest } from '@/lib/pagarme/client';
import { brazilDateToEndIso, brazilDateToStartIso } from '@/lib/datetime/brazil';
import {
  handlePagarmeChargePaid,
  type PagarmeWebhookCharge,
} from '@/lib/pagarme/webhook-handlers';
import { isPagarmeChargePaid } from '@/lib/pagarme/one-time-order';

type PagarmeChargeListItem = PagarmeWebhookCharge & {
  id: string;
  status?: string;
};

type PagarmeChargeListResponse = {
  data?: PagarmeChargeListItem[];
};

export async function listPagarmePaidCharges(
  fromDateKey: string,
  toDateKey: string
): Promise<PagarmeChargeListItem[]> {
  const createdSince = brazilDateToStartIso(fromDateKey);
  const createdUntil = brazilDateToEndIso(toDateKey);

  const response = await pagarmeRequest<PagarmeChargeListResponse>(
    `/charges?size=100&status=paid&created_since=${encodeURIComponent(createdSince)}&created_until=${encodeURIComponent(createdUntil)}`
  );

  return (response.data ?? []).filter((charge) =>
    isPagarmeChargePaid(charge.status)
  );
}

export async function importMissingPagarmeCharges(
  supabase: SupabaseClient,
  fromDateKey: string,
  toDateKey: string
): Promise<{ imported: number; skipped: number; chargeIds: string[] }> {
  const remoteCharges = await listPagarmePaidCharges(fromDateKey, toDateKey);
  let imported = 0;
  let skipped = 0;
  const chargeIds: string[] = [];

  for (const charge of remoteCharges) {
    if (!charge.id) {
      skipped += 1;
      continue;
    }

    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('pagarme_charge_id', charge.id)
      .maybeSingle();

    if (existing) {
      skipped += 1;
      continue;
    }

    const result = await handlePagarmeChargePaid(supabase, charge);
    if (result === 'processed') {
      imported += 1;
      chargeIds.push(charge.id);
    } else {
      skipped += 1;
    }
  }

  return { imported, skipped, chargeIds };
}
