import type { SupabaseClient } from '@supabase/supabase-js';
import {
  applyBillingDayToAnchor,
  clampSubscriptionBillingDay,
  resolveBillingDayAfterCatchUpCharge,
  resolveNextBillingDateForDay,
} from '@/lib/pagarme/billing-day';
import {
  PAGARME_CONFIGURED,
  PagarmeApiError,
  pagarmeRequest,
} from '@/lib/pagarme/client';
import { userFacingPagarmeError } from '@/lib/pagarme/errors';
import { chargePagarmeSubscriptionNow } from '@/lib/pagarme/manual-charge';

export {
  applyBillingDayToAnchor,
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

function isPeriodAlreadyBilledError(error: unknown): boolean {
  if (!(error instanceof PagarmeApiError)) return false;
  if (error.status !== 412) return false;
  return /already been billed/i.test(error.message || error.body.message || '');
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

async function fetchPagarmeSubscriptionBilling(
  pagarmeSubscriptionId: string
): Promise<PagarmeSubscriptionBilling> {
  return pagarmeRequest<PagarmeSubscriptionBilling>(
    `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}`
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
      pagarmeBillingDateSynced: boolean;
      message: string;
    }
  | { status: 'error'; error: string; statusCode?: number };

async function syncLocalSubscriptionBilling(
  admin: SupabaseClient,
  input: {
    subscriptionId: string;
    nextBillingIso: string;
    activate: boolean;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const nowIso = new Date().toISOString();
  const localPatch: Record<string, unknown> = {
    next_billing_date: input.nextBillingIso,
    current_period_end: input.nextBillingIso,
    updated_at: nowIso,
  };

  if (input.activate) {
    localPatch.status = 'active';
    localPatch.current_period_start = nowIso;
  }

  const { error: updateError, data: updatedRows } = await admin
    .from('subscriptions')
    .update(localPatch)
    .eq('id', input.subscriptionId)
    .select('id');

  if (updateError) {
    return { ok: false, error: updateError.message };
  }
  if (!updatedRows?.length) {
    return { ok: false, error: 'Nenhuma linha atualizada.' };
  }
  return { ok: true };
}

/**
 * Altera o dia de vencimento no Pagar.me (+ local).
 *
 * Com cobrança de atraso:
 * 1) tenta remarcar a data ANTES de cobrar (evita 412 "period already billed");
 * 2) cobra;
 * 3) se a data ainda não foi sincronizada no gateway, tenta de novo após a cobrança
 *    usando o next_billing remoto como âncora; se o Pagar.me bloquear (412),
 *    sincroniza o sistema local mesmo assim e avisa.
 */
export async function changePagarmeSubscriptionBillingDay(
  admin: SupabaseClient,
  input: {
    subscriptionId: string;
    billingDay: number;
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

  const pagarmeSubscriptionId = subscription.pagarme_subscription_id;
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
  let pagarmeBillingDateSynced = false;

  const desiredAfterCatchUp = resolveBillingDayAfterCatchUpCharge(billingDay);
  const desiredWithoutCharge = resolveNextBillingDateForDay(billingDay);

  try {
    // 1) Remarcar ANTES da cobrança quando possível (evita 412 pós-billing).
    if (shouldCharge) {
      try {
        await updatePagarmeSubscriptionBillingDate(
          pagarmeSubscriptionId,
          desiredAfterCatchUp
        );
        pagarmeBillingDateSynced = true;
      } catch (error) {
        console.warn(
          '[pagarme] billing-date before charge skipped:',
          input.subscriptionId,
          error instanceof Error ? error.message : error
        );
      }
    }

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

      if (chargeResult.status !== 'charged') {
        return {
          status: 'error',
          error:
            `Cobrança ainda não confirmada` +
            (chargeResult.chargeStatus ? ` (${chargeResult.chargeStatus})` : '') +
            `. ${'message' in chargeResult ? chargeResult.message : ''} ` +
            `Não finalizamos a troca do dia. Aguarde a confirmação ou desmarque "Cobrar atraso".`,
          statusCode: 409,
        };
      }

      chargedOverdue = true;
    }

    let nextBillingDate = chargedOverdue
      ? desiredAfterCatchUp
      : desiredWithoutCharge;

    // 2) Se ainda não sincronizou no gateway, tenta de novo (âncora = next_billing remoto).
    if (!pagarmeBillingDateSynced) {
      try {
        const remote = await fetchPagarmeSubscriptionBilling(pagarmeSubscriptionId);
        if (remote.next_billing_at) {
          nextBillingDate = applyBillingDayToAnchor(
            remote.next_billing_at,
            billingDay
          );
        }

        await updatePagarmeSubscriptionBillingDate(
          pagarmeSubscriptionId,
          nextBillingDate
        );
        pagarmeBillingDateSynced = true;
      } catch (error) {
        if (isPeriodAlreadyBilledError(error) && chargedOverdue) {
          // Cobrança ok; Pagar.me não deixa mais PATCH billing-date neste período.
          // Mantemos a data desejada no sistema local e avisamos.
          console.warn(
            '[pagarme] billing-date blocked after charge (412); syncing local only:',
            input.subscriptionId,
            formatPagarmeDate(nextBillingDate)
          );
          pagarmeBillingDateSynced = false;
        } else if (!chargedOverdue) {
          return {
            status: 'error',
            error: userFacingPagarmeError(error),
            statusCode: 502,
          };
        } else {
          console.error(
            '[pagarme] billing-date patch failed after charge:',
            input.subscriptionId,
            error
          );
          // Ainda sincroniza local para não deixar past_due após cobrança ok.
          pagarmeBillingDateSynced = false;
        }
      }
    }

    const nextBillingIso = nextBillingDate.toISOString();
    const local = await syncLocalSubscriptionBilling(admin, {
      subscriptionId: subscription.id,
      nextBillingIso,
      activate: chargedOverdue || subscription.status === 'past_due',
    });

    if (!local.ok) {
      return {
        status: 'error',
        error: pagarmeBillingDateSynced
          ? `Gateway atualizado para ${formatPagarmeDate(nextBillingDate)}, mas falhou no sistema local (${local.error}).`
          : `Cobrança pode ter sido ok, mas falhou ao salvar a nova data localmente (${local.error}).`,
        statusCode: 502,
      };
    }

    const dayLabel = String(billingDay).padStart(2, '0');
    let message: string;
    if (chargedOverdue && pagarmeBillingDateSynced) {
      message = `Atraso cobrado e próximo vencimento remarcado para todo dia ${dayLabel}.`;
    } else if (chargedOverdue && !pagarmeBillingDateSynced) {
      message =
        `Atraso cobrado e sistema atualizado para dia ${dayLabel} (${formatPagarmeDate(nextBillingDate)}). ` +
        `O Pagar.me bloqueou a alteração da data neste período ("already been billed"). ` +
        `Confira no painel Pagar.me se a próxima cobrança automática está no dia correto.`;
    } else {
      message = `Próximo vencimento remarcado para todo dia ${dayLabel}.`;
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
      pagarmeBillingDateSynced,
      message,
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
