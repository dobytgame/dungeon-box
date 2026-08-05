import type { SupabaseClient } from '@supabase/supabase-js';
import { PAGARME_CONFIGURED, pagarmeRequest } from '@/lib/pagarme/client';
import { userFacingPagarmeError } from '@/lib/pagarme/errors';
import { chargePagarmeSubscriptionNow } from '@/lib/pagarme/manual-charge';

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

function clampBillingDay(day: number): number {
  return Math.min(28, Math.max(1, Math.trunc(day)));
}

export function extractBillingDay(
  nextBillingDate: string | Date | null | undefined
): number | null {
  if (!nextBillingDate) return null;
  const parsed =
    nextBillingDate instanceof Date
      ? nextBillingDate
      : new Date(
          nextBillingDate.includes('T')
            ? nextBillingDate
            : `${nextBillingDate}T12:00:00Z`
        );
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getUTCDate();
}

/**
 * Próxima ocorrência do dia de cobrança (1–28), mínimo D+1 UTC.
 * Ex.: hoje 05/08, dia 7 → 07/08; hoje 08/08, dia 7 → 07/09.
 */
export function resolveNextBillingDateForDay(
  billingDay: number,
  now = new Date()
): Date {
  const day = clampBillingDay(billingDay);
  const minStart = startOfUtcDay(now);
  minStart.setUTCDate(minStart.getUTCDate() + 1);

  let candidate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day)
  );

  if (candidate.getTime() < minStart.getTime()) {
    candidate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, day)
    );
  }

  return candidate;
}

/**
 * Após quitar o atraso agora: próxima renovação = dia escolhido no mês seguinte.
 * Ex.: cobra em 05/08 e muda para dia 7 → próxima 07/09.
 */
export function resolveBillingDayAfterCatchUpCharge(
  billingDay: number,
  now = new Date()
): Date {
  const day = clampBillingDay(billingDay);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, day));
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
 * Altera o dia de vencimento no Pagar.me (+ local) e, se houver atraso,
 * dispara a cobrança pendente antes de remarcar a próxima data.
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

  const billingDay = clampBillingDay(input.billingDay);
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

      chargedOverdue = true;
      chargeMode = chargeResult.mode;
      chargeAmountCents = chargeResult.amountCents;
      chargeStatus =
        chargeResult.status === 'charged'
          ? chargeResult.chargeStatus
          : chargeResult.chargeStatus;
    }

    const nextBillingDate = chargedOverdue
      ? resolveBillingDayAfterCatchUpCharge(billingDay)
      : resolveNextBillingDateForDay(billingDay);

    const remote = await updatePagarmeSubscriptionBillingDate(
      subscription.pagarme_subscription_id,
      nextBillingDate
    );

    const nextBillingIso =
      remote.next_billing_at ?? nextBillingDate.toISOString();
    const nowIso = new Date().toISOString();

    const { error: updateError } = await admin
      .from('subscriptions')
      .update({
        next_billing_date: nextBillingIso,
        current_period_end: nextBillingIso,
        ...(chargedOverdue && subscription.status === 'past_due'
          ? { status: 'active' }
          : {}),
        updated_at: nowIso,
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error(
        '[pagarme] billing day local update:',
        subscription.id,
        updateError.message
      );
      return {
        status: 'error',
        error:
          'Data alterada no Pagar.me, mas falhou ao sincronizar localmente. Atualize a assinatura manualmente.',
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
