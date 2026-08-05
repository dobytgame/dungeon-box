import type { SupabaseClient } from '@supabase/supabase-js';
import { PAGARME_CONFIGURED, pagarmeRequest } from '@/lib/pagarme/client';
import { userFacingPagarmeError } from '@/lib/pagarme/errors';
import { isPagarmeChargePaid } from '@/lib/pagarme/one-time-order';
import {
  resolveSubscriptionRecurringCharge,
  type PlanChargeRow,
} from '@/lib/subscriptions/recurring-charge';

type PagarmeCharge = {
  id?: string;
  status?: string;
  amount?: number;
  last_transaction?: {
    status?: string;
    acquirer_message?: string | null;
  } | null;
};

type PagarmeInvoice = {
  id?: string;
  status?: string;
  amount?: number;
  subscription_id?: string;
  charge?: PagarmeCharge | null;
  due_at?: string | null;
  created_at?: string | null;
};

type PagarmeInvoiceList = {
  data?: PagarmeInvoice[];
};

type PagarmeCycleResponse = {
  id?: string;
  status?: string;
  billing_at?: string;
  start_at?: string;
  end_at?: string;
};

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function chargeStatus(charge?: PagarmeCharge | null): string {
  return (
    charge?.status?.trim().toLowerCase() ||
    charge?.last_transaction?.status?.trim().toLowerCase() ||
    ''
  );
}

function isRetryableChargeStatus(status: string): boolean {
  return (
    status === 'failed' ||
    status === 'canceled' ||
    status === 'cancelled' ||
    status === 'not_authorized' ||
    status === 'pending' ||
    status === 'processing'
  );
}

async function listSubscriptionInvoices(
  pagarmeSubscriptionId: string
): Promise<PagarmeInvoice[]> {
  const listed = await pagarmeRequest<PagarmeInvoiceList>(
    `/invoices?subscription_id=${encodeURIComponent(pagarmeSubscriptionId)}&size=20&page=1`
  );
  return listed.data ?? [];
}

function pickRetryableInvoice(invoices: PagarmeInvoice[]): PagarmeInvoice | null {
  const ranked = invoices
    .filter((invoice) => {
      const invoiceStatus = invoice.status?.trim().toLowerCase() ?? '';
      if (invoiceStatus === 'paid' || invoiceStatus === 'canceled') return false;
      const charge = invoice.charge;
      if (!charge?.id) return false;
      return isRetryableChargeStatus(chargeStatus(charge));
    })
    .sort((a, b) =>
      String(b.created_at ?? b.due_at ?? '').localeCompare(
        String(a.created_at ?? a.due_at ?? '')
      )
    );

  return ranked[0] ?? null;
}

export type ChargePagarmeSubscriptionNowResult =
  | {
      status: 'charged';
      mode: 'retry' | 'renew';
      amountCents: number | null;
      expectedCents: number;
      promoSummary: string | null;
      chargeId: string | null;
      chargeStatus: string | null;
      invoiceId: string | null;
      cycleId: string | null;
      acquirerMessage: string | null;
    }
  | {
      status: 'pending';
      mode: 'retry' | 'renew';
      amountCents: number | null;
      expectedCents: number;
      promoSummary: string | null;
      chargeId: string | null;
      chargeStatus: string | null;
      invoiceId: string | null;
      cycleId: string | null;
      message: string;
    }
  | { status: 'error'; error: string; statusCode?: number };

/**
 * Cobra agora uma assinatura Pagar.me (atraso/falha):
 * 1) tenta reprocessar a última fatura/cobrança pendente ou falha;
 * 2) se não houver, renova o ciclo (`POST /subscriptions/{id}/cycles`).
 */
export async function chargePagarmeSubscriptionNow(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<ChargePagarmeSubscriptionNowResult> {
  if (!PAGARME_CONFIGURED) {
    return { status: 'error', error: 'Pagar.me não configurado.', statusCode: 503 };
  }

  const { data: subscription } = await admin
    .from('subscriptions')
    .select(
      `
      id,
      status,
      promo_code,
      shipping_cents,
      special_notes,
      pagarme_subscription_id,
      is_partner,
      plans!plan_id(name, slug, price_cents)
    `
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) {
    return { status: 'error', error: 'Assinatura não encontrada.', statusCode: 404 };
  }

  if (subscription.is_partner) {
    return {
      status: 'error',
      error: 'Assinatura de parceiro não possui cobrança.',
      statusCode: 422,
    };
  }

  if (!subscription.pagarme_subscription_id) {
    return {
      status: 'error',
      error: 'Assinatura sem vínculo Pagar.me.',
      statusCode: 422,
    };
  }

  const plan = relOne(subscription.plans as PlanChargeRow | PlanChargeRow[] | null);
  if (!plan?.slug || plan.price_cents == null) {
    return { status: 'error', error: 'Plano da assinatura não encontrado.', statusCode: 404 };
  }

  const charge = await resolveSubscriptionRecurringCharge(admin, plan, {
    promo_code: subscription.promo_code,
    shipping_cents: subscription.shipping_cents,
    special_notes: subscription.special_notes,
  });

  try {
    const invoices = await listSubscriptionInvoices(
      subscription.pagarme_subscription_id
    );
    const retryInvoice = pickRetryableInvoice(invoices);

    if (retryInvoice?.charge?.id) {
      const retried = await pagarmeRequest<PagarmeCharge>(
        `/charges/${encodeURIComponent(retryInvoice.charge.id)}/retry`,
        { method: 'POST' }
      );

      const status = chargeStatus(retried) || chargeStatus(retryInvoice.charge);
      const amountCents = Math.round(
        retried.amount ?? retryInvoice.charge.amount ?? retryInvoice.amount ?? 0
      );
      const paid = isPagarmeChargePaid(status);

      if (paid) {
        return {
          status: 'charged',
          mode: 'retry',
          amountCents: amountCents || charge.totalCents,
          expectedCents: charge.totalCents,
          promoSummary: charge.promoSummary,
          chargeId: retried.id ?? retryInvoice.charge.id,
          chargeStatus: status || 'paid',
          invoiceId: retryInvoice.id ?? null,
          cycleId: null,
          acquirerMessage:
            retried.last_transaction?.acquirer_message?.trim() || null,
        };
      }

      return {
        status: 'pending',
        mode: 'retry',
        amountCents: amountCents || charge.totalCents,
        expectedCents: charge.totalCents,
        promoSummary: charge.promoSummary,
        chargeId: retried.id ?? retryInvoice.charge.id,
        chargeStatus: status || null,
        invoiceId: retryInvoice.id ?? null,
        cycleId: null,
        message:
          retried.last_transaction?.acquirer_message?.trim() ||
          'Reprocessamento enviado. Acompanhe o status da cobrança no Pagar.me / webhooks.',
      };
    }

    const cycle = await pagarmeRequest<PagarmeCycleResponse>(
      `/subscriptions/${encodeURIComponent(subscription.pagarme_subscription_id)}/cycles`,
      { method: 'POST' }
    );

    // Após renovar, a fatura/cobrança costuma aparecer em seguida.
    let latestChargeId: string | null = null;
    let latestChargeStatus: string | null = null;
    let latestInvoiceId: string | null = null;
    let latestAmount: number | null = null;
    let acquirerMessage: string | null = null;

    try {
      const refreshed = await listSubscriptionInvoices(
        subscription.pagarme_subscription_id
      );
      const newest = [...refreshed].sort((a, b) =>
        String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
      )[0];
      if (newest) {
        latestInvoiceId = newest.id ?? null;
        latestAmount = Math.round(newest.amount ?? newest.charge?.amount ?? 0) || null;
        latestChargeId = newest.charge?.id ?? null;
        latestChargeStatus = chargeStatus(newest.charge) || newest.status || null;
        acquirerMessage =
          newest.charge?.last_transaction?.acquirer_message?.trim() || null;
      }
    } catch {
      // ignore refresh errors; renew already succeeded at gateway
    }

    if (isPagarmeChargePaid(latestChargeStatus)) {
      return {
        status: 'charged',
        mode: 'renew',
        amountCents: latestAmount ?? charge.totalCents,
        expectedCents: charge.totalCents,
        promoSummary: charge.promoSummary,
        chargeId: latestChargeId,
        chargeStatus: latestChargeStatus,
        invoiceId: latestInvoiceId,
        cycleId: cycle.id ?? null,
        acquirerMessage,
      };
    }

    return {
      status: 'pending',
      mode: 'renew',
      amountCents: latestAmount ?? charge.totalCents,
      expectedCents: charge.totalCents,
      promoSummary: charge.promoSummary,
      chargeId: latestChargeId,
      chargeStatus: latestChargeStatus,
      invoiceId: latestInvoiceId,
      cycleId: cycle.id ?? null,
      message:
        acquirerMessage ||
        'Ciclo renovado no Pagar.me. A cobrança foi disparada — confirme via webhook ou painel.',
    };
  } catch (error) {
    console.error('[pagarme] manual charge:', subscriptionId, error);
    return {
      status: 'error',
      error: userFacingPagarmeError(error),
      statusCode: 502,
    };
  }
}
