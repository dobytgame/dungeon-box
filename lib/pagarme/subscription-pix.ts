import type { SupabaseClient } from '@supabase/supabase-js';
import { pagarmeRequest } from '@/lib/pagarme/client';
import {
  createPagarmePixOrder,
  extractPagarmePixWithRetry,
  extractPagarmeStorePix,
  fetchPagarmeOrder,
  isPagarmeChargePaid,
  resolvePagarmeOrderChargeIds,
  type PagarmeStorePixDetails,
} from '@/lib/pagarme/one-time-order';
import { buildPagarmeSubscriptionPixCode } from '@/lib/pagarme/store-order-code';

/** PIX enviado por e-mail precisa de prazo maior que o checkout na loja (1h). */
export const ADMIN_PIX_EXPIRES_IN_SECONDS = 3 * 24 * 60 * 60;

/** PIX gerado no checkout do combo: o cliente paga na hora, com folga para o app do banco. */
export const CHECKOUT_COMBO_PIX_EXPIRES_IN_SECONDS = 24 * 60 * 60;

export async function cancelPendingSubscriptionPixCharges(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<void> {
  const { data: rows } = await supabase
    .from('payments')
    .select('id, pagarme_charge_id')
    .eq('subscription_id', subscriptionId)
    .eq('status', 'pending')
    .eq('payment_method', 'pix');

  for (const row of rows ?? []) {
    const chargeId = row.pagarme_charge_id as string | null;
    if (chargeId) {
      try {
        await pagarmeRequest(`/charges/${encodeURIComponent(chargeId)}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.warn('[pagarme] cancel pending pix charge:', chargeId, error);
      }
    }

    await supabase
      .from('payments')
      .update({ status: 'cancelled' })
      .eq('id', row.id)
      .eq('status', 'pending');
  }
}

export async function findReusableSubscriptionPix(
  supabase: SupabaseClient,
  subscriptionId: string,
  valueCents: number
): Promise<
  | {
      kind: 'open';
      paymentId: string;
      orderId: string;
      chargeId: string;
      pix: PagarmeStorePixDetails;
    }
  | {
      kind: 'paid';
      paymentId: string;
      orderId: string;
      chargeId: string;
    }
  | null
> {
  const { data: payment } = await supabase
    .from('payments')
    .select('id, pagarme_order_id, pagarme_charge_id, amount_cents')
    .eq('subscription_id', subscriptionId)
    .eq('status', 'pending')
    .eq('payment_method', 'pix')
    .eq('amount_cents', valueCents)
    .not('pagarme_order_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment?.pagarme_order_id) return null;

  try {
    const order = await fetchPagarmeOrder(payment.pagarme_order_id as string);
    const ids = resolvePagarmeOrderChargeIds(order);
    if (!ids.chargeId) return null;

    if (isPagarmeChargePaid(ids.chargeStatus)) {
      return {
        kind: 'paid',
        paymentId: payment.id as string,
        orderId: ids.orderId,
        chargeId: ids.chargeId,
      };
    }

    const pix = extractPagarmeStorePix(order);
    if (!pix?.payload?.trim()) return null;

    if (pix.expirationDate) {
      const expiresAt = new Date(pix.expirationDate).getTime();
      if (Number.isFinite(expiresAt) && expiresAt < Date.now() + 60_000) {
        return null;
      }
    }

    return {
      kind: 'open',
      paymentId: payment.id as string,
      orderId: ids.orderId,
      chargeId: ids.chargeId,
      pix,
    };
  } catch (error) {
    console.warn(
      '[pagarme] reuse pending pix skipped:',
      subscriptionId,
      error
    );
    return null;
  }
}

export type PagarmeSubscriptionPixChargeKind =
  | 'admin_pix'
  | 'pix_renewal'
  | 'combo'
  | 'plan_upgrade';

export async function createPagarmeSubscriptionPixPayment(
  supabase: SupabaseClient,
  input: {
    customerId: string;
    userId: string;
    subscriptionId: string;
    valueCents: number;
    description: string;
    chargeKind: PagarmeSubscriptionPixChargeKind;
    billingTerm?: string | null;
    statusDetail?: string | null;
    expiresInSeconds?: number;
  }
): Promise<{
  paymentId: string;
  orderId: string;
  chargeId: string;
  pix: PagarmeStorePixDetails;
  alreadyPaid: boolean;
}> {
  const isCombo = input.chargeKind === 'combo';
  const order = await createPagarmePixOrder({
    customerId: input.customerId,
    valueCents: input.valueCents,
    description: input.description,
    orderCode: buildPagarmeSubscriptionPixCode(
      input.subscriptionId,
      isCombo ? 'combo' : 'pix'
    ),
    metadata: {
      subscription_id: input.subscriptionId,
      charge_kind: input.chargeKind,
      ...(input.billingTerm ? { billing_term: input.billingTerm } : {}),
    },
    expiresInSeconds: input.expiresInSeconds ?? ADMIN_PIX_EXPIRES_IN_SECONDS,
  });

  const ids = resolvePagarmeOrderChargeIds(order);
  if (!ids.chargeId) {
    throw new Error('Não foi possível gerar a cobrança PIX no Pagar.me.');
  }

  const alreadyPaid = isPagarmeChargePaid(ids.chargeStatus);
  const pix = alreadyPaid ? null : await extractPagarmePixWithRetry(order);
  if (!alreadyPaid && !pix?.payload?.trim()) {
    throw new Error('Não foi possível gerar o QR Code PIX. Tente novamente.');
  }

  const { data: paymentRow, error: paymentError } = await supabase
    .from('payments')
    .upsert(
      {
        user_id: input.userId,
        subscription_id: input.subscriptionId,
        pagarme_order_id: ids.orderId,
        pagarme_charge_id: ids.chargeId,
        amount_cents: input.valueCents,
        currency: 'BRL',
        status: alreadyPaid ? 'approved' : 'pending',
        paid_at: alreadyPaid ? new Date().toISOString() : null,
        payment_method: 'pix',
        installments: 1,
        status_detail: input.statusDetail ?? null,
      },
      { onConflict: 'pagarme_charge_id' }
    )
    .select('id')
    .single();

  if (paymentError || !paymentRow) {
    throw new Error('Não foi possível registrar o pagamento PIX.');
  }

  return {
    paymentId: paymentRow.id as string,
    orderId: ids.orderId,
    chargeId: ids.chargeId,
    pix: pix ?? {
      payload: '',
      expirationDate: '',
    },
    alreadyPaid,
  };
}
