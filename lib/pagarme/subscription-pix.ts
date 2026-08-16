import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createPagarmePixOrder,
  extractPagarmePixWithRetry,
  isPagarmeChargePaid,
  resolvePagarmeOrderChargeIds,
  type PagarmeStorePixDetails,
} from '@/lib/pagarme/one-time-order';
import { buildPagarmeSubscriptionPixCode } from '@/lib/pagarme/store-order-code';

/** PIX enviado por e-mail precisa de prazo maior que o checkout na loja (1h). */
export const ADMIN_PIX_EXPIRES_IN_SECONDS = 3 * 24 * 60 * 60;

export type PagarmeSubscriptionPixChargeKind =
  | 'admin_pix'
  | 'pix_renewal'
  | 'combo';

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
