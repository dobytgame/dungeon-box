import type { SupabaseClient } from '@supabase/supabase-js';
import {
  clampSubscriptionBillingDay,
  resolveBillingDayAfterCatchUpCharge,
  resolveNextBillingDateForDay,
} from '@/lib/pagarme/billing-day';
import { PAGARME_CONFIGURED, pagarmeRequest } from '@/lib/pagarme/client';
import { userFacingPagarmeError } from '@/lib/pagarme/errors';
import { chargePagarmeSubscriptionNow } from '@/lib/pagarme/manual-charge';

export {
  extractBillingDay,
  resolveBillingDayAfterCatchUpCharge,
  resolveNextBillingDateForDay,
  clampSubscriptionBillingDay,
} from '@/lib/pagarme/billing-day';

type PagarmeSubscriptionBilling = {
  id: string;
  status?: string;
  next_billing_at?: string | null;
  start_at?: string | null;
};

function startOfUtcDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function formatPagarmeDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isBillingOverdue(
  status: string | null | undefined,
  nextBillingDate: string | null | undefined,
  now = new Date()
): boolean {
  if ((status ?? '').trim() === 'past_due') return true;
  if (!nextBillingDate) return false;
  const billing = new Date(
    nextBillingDate.includes('T')
      ? nextBillingDate
      : `${nextBillingDate}T12:00:00Z`
  );
  if (Number.isNaN(billing.getTime())) return false;
  return startOfUtcDay(billing).getTime() < startOfUtcDay(now).getTime();
}

export async function updatePagarmeSubscriptionBillingDate(
  pagarmeSubscriptionId: string,
  nextBillingAt: Date
): Promise<PagarmeSubscriptionBilling> {
  return pagarmeRequest<PagarmeSubscriptionBilling>(
    `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}/billing-date`,
    {
      method: 'PATCH',
      body: {
        next_billing_at: formatPagarmeDate(nextBillingAt),
      },
    }
  );
}

export type ChangePagarmeBillingDayResult =
  | {
      status: 'updated';
      billingDay: number;
      previousBillingDate: string | null;
      nextBillingDate: string;
      chargedOverdue: boolean;
      chargeMode: 'retry' | 'renew' | null;
      chargeAmountCents: number | null;
      chargeStatus: string | null;
      message: string;
    }
  | { status: 'error'; error: string; statusCode?: number };

/**
 * Altera o dia de vencimento no Pagar.me (+ local).
 * Se pedir cobrança do atraso, só remarcar para o mês seguinte após pagamento confirmado.
 */
export async function changePagarmeSubscriptionBillingDay(
  admin: SupabaseClient,
  input: {
    subscriptionId: string;
    billingDay: number;
    /** Se omitido, cobra automaticamente quando estiver em atraso. */
    chargeOverdue?: boolean;
  }
): Promise<ChangePagarmeBillingDayResult> {
  if (!PAGARME_CONFIGURED) {
    return { status: 'error', error: 'Pagar.me não configurado.', statusCode: 503 };
  }

  const billingDay = clampSubscriptionBillingDay(input.billingDay);
  if (!Number.isFinite(billingDay) || billingDay < 1 || billingDay > 28) {
    return {
      status: 'error',
      error: 'Informe um dia de vencimento entre 1 e 28.',
      statusCode: 400,
    };
  }

  const { data: subscription } = await admin
    .from('subscriptions')
    .select(
      `
      id,
      status,
      next_billing_date,
      pagarme_subscription_id,
      is_partner
    `
    )
    .eq('id', input.subscriptionId)
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

  const overdue = isBillingOverdue(
    subscription.status,
    subscription.next_billing_date
  );
  const shouldCharge =
    input.chargeOverdue === undefined ? overdue : Boolean(input.chargeOverdue);

  let chargedOverdue = false;
  let chargeMode: 'retry' | 'renew' | null = null;
  let chargeAmountCents: number | null = null;
  let chargeStatus: string | null = null;

  try {
    if (shouldCharge) {
      const chargeResult = await chargePagarmeSubscriptionNow(
        admin,
        input.subscriptionId
      );

      if (chargeResult.status === 'error') {
        return {
          status: 'error',
          error: `Não foi possível cobrar o atraso: ${chargeResult.error}`,
          statusCode: chargeResult.statusCode,
        };
      }

      chargeMode = chargeResult.mode;
      chargeAmountCents = chargeResult.amountCents;
      chargeStatus = chargeResult.chargeStatus;

      // Só avança o calendário (mês seguinte) com pagamento confirmado.
      if (chargeResult.status !== 'charged') {
        return {
          status: 'error',
          error:
            `Cobrança ainda não confirmada` +
            (chargeResult.chargeStatus ? ` (${chargeResult.chargeStatus})` : '') +
            `. ${'message' in chargeResult ? chargeResult.message : ''} ` +
            `Não alteramos o dia de vencimento. Aguarde a confirmação ou desmarque "Cobrar atraso" para só remarcar a data.`,
          statusCode: 409,
        };
      }

      chargedOverdue = true;
    }

    const nextBillingDate = chargedOverdue
      ? resolveBillingDayAfterCatchUpCharge(billingDay)
      : resolveNextBillingDateForDay(billingDay);

    // Data calculada por nós é a fonte da verdade local.
    const nextBillingIso = nextBillingDate.toISOString();

    try {
      await updatePagarmeSubscriptionBillingDate(
        subscription.pagarme_subscription_id,
        nextBillingDate
      );
    } catch (error) {
      console.error(
        '[pagarme] billing-date patch failed after charge:',
        input.subscriptionId,
        error
      );
      return {
        status: 'error',
        error: chargedOverdue
          ? `Cobrança ok, mas falhou ao remarcar o vencimento no Pagar.me: ${userFacingPagarmeError(error)}`
          : userFacingPagarmeError(error),
        statusCode: 502,
      };
    }

    const nowIso = new Date().toISOString();
    const localPatch: Record<string, unknown> = {
      next_billing_date: nextBillingIso,
      current_period_end: nextBillingIso,
      updated_at: nowIso,
    };

    if (chargedOverdue) {
      localPatch.status = 'active';
      localPatch.current_period_start = nowIso;
    }

    const { error: updateError, data: updatedRows } = await admin
      .from('subscriptions')
      .update(localPatch)
      .eq('id', subscription.id)
      .select('id, next_billing_date, status');

    if (updateError) {
      console.error(
        '[pagarme] billing day local update:',
        subscription.id,
        updateError.message,
        updateError
      );
      return {
        status: 'error',
        error:
          `Data alterada no Pagar.me para ${formatPagarmeDate(nextBillingDate)}, mas falhou ao sincronizar no sistema (${updateError.message}). Atualize next_billing_date manualmente.`,
        statusCode: 502,
      };
    }

    if (!updatedRows?.length) {
      console.error(
        '[pagarme] billing day local update returned 0 rows:',
        subscription.id
      );
      return {
        status: 'error',
        error:
          `Data alterada no Pagar.me para ${formatPagarmeDate(nextBillingDate)}, mas nenhuma linha local foi atualizada. Verifique permissões/RLS.`,
        statusCode: 502,
      };
    }

    return {
      status: 'updated',
      billingDay,
      previousBillingDate: subscription.next_billing_date,
      nextBillingDate: nextBillingIso,
      chargedOverdue,
      chargeMode,
      chargeAmountCents,
      chargeStatus,
      message: chargedOverdue
        ? `Atraso cobrado e próximo vencimento remarcado para todo dia ${String(billingDay).padStart(2, '0')}.`
        : `Próximo vencimento remarcado para todo dia ${String(billingDay).padStart(2, '0')}.`,
    };
  } catch (error) {
    console.error('[pagarme] change billing day:', input.subscriptionId, error);
    return {
      status: 'error',
      error: userFacingPagarmeError(error),
      statusCode: 502,
    };
  }
}
