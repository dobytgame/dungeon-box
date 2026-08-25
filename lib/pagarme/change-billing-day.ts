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

function addUtcMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate())
  );
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

/**
 * Data alvo: sempre ancora no next_billing do gateway (ou local), nunca “amanhã”
 * se o ciclo remoto já estiver no mês seguinte — isso causa 412.
 */
export function resolveDesiredPagarmeBillingDate(input: {
  billingDay: number;
  remoteNextBillingAt?: string | null;
  localNextBillingDate?: string | null;
  afterCatchUpCharge?: boolean;
}): Date {
  const anchor =
    input.remoteNextBillingAt ||
    input.localNextBillingDate ||
    null;

  if (input.afterCatchUpCharge) {
    if (anchor) {
      return applyBillingDayToAnchor(anchor, input.billingDay);
    }
    return resolveBillingDayAfterCatchUpCharge(input.billingDay);
  }

  if (anchor) {
    return applyBillingDayToAnchor(anchor, input.billingDay);
  }

  return resolveNextBillingDateForDay(input.billingDay);
}

/**
 * Tenta PATCH billing-date; se 412, tenta +1 mês uma vez.
 * Retorna se sincronizou no gateway e a data efetiva usada.
 */
async function trySyncPagarmeBillingDate(
  pagarmeSubscriptionId: string,
  desired: Date
): Promise<{ synced: boolean; nextBillingDate: Date; blockedByBilledPeriod: boolean }> {
  try {
    await updatePagarmeSubscriptionBillingDate(pagarmeSubscriptionId, desired);
    return {
      synced: true,
      nextBillingDate: desired,
      blockedByBilledPeriod: false,
    };
  } catch (error) {
    if (!isPeriodAlreadyBilledError(error)) {
      throw error;
    }
  }

  const shifted = addUtcMonths(desired, 1);
  try {
    await updatePagarmeSubscriptionBillingDate(pagarmeSubscriptionId, shifted);
    return {
      synced: true,
      nextBillingDate: shifted,
      blockedByBilledPeriod: false,
    };
  } catch (error) {
    if (!isPeriodAlreadyBilledError(error)) {
      throw error;
    }
  }

  return {
    synced: false,
    nextBillingDate: desired,
    blockedByBilledPeriod: true,
  };
}

export type ChangePagarmeBillingDayResult =
  | {
      status: 'updated';
      billingDay: number;
      previousBillingDate: string | null;
      nextBillingDate: string;
      chargedOverdue: boolean;
      chargeMode: 'retry' | 'renew' | 'catchup' | null;
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
 * Se o gateway retornar 412 ("period already billed"), o sistema local
 * ainda é atualizado — nunca devolvemos esse erro cru ao admin.
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
  let chargeMode: 'retry' | 'renew' | 'catchup' | null = null;
  let chargeAmountCents: number | null = null;
  let chargeStatus: string | null = null;
  let pagarmeBillingDateSynced = false;
  let remoteNext: string | null = null;

  try {
    try {
      const remoteBefore = await fetchPagarmeSubscriptionBilling(
        pagarmeSubscriptionId
      );
      remoteNext = remoteBefore.next_billing_at ?? null;
    } catch (error) {
      console.warn(
        '[pagarme] fetch subscription before billing-day change:',
        input.subscriptionId,
        error instanceof Error ? error.message : error
      );
    }

    // 1) Remarcar ANTES da cobrança quando possível (evita 412 pós-billing).
    if (shouldCharge) {
      const desiredBeforeCharge = resolveDesiredPagarmeBillingDate({
        billingDay,
        remoteNextBillingAt: remoteNext,
        localNextBillingDate: subscription.next_billing_date,
        afterCatchUpCharge: true,
      });

      try {
        const early = await trySyncPagarmeBillingDate(
          pagarmeSubscriptionId,
          desiredBeforeCharge
        );
        pagarmeBillingDateSynced = early.synced;
        if (early.synced) {
          remoteNext = formatPagarmeDate(early.nextBillingDate);
        }
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

      try {
        const remoteAfter = await fetchPagarmeSubscriptionBilling(
          pagarmeSubscriptionId
        );
        remoteNext = remoteAfter.next_billing_at ?? remoteNext;
      } catch {
        /* keep previous remoteNext */
      }
    }

    let nextBillingDate = resolveDesiredPagarmeBillingDate({
      billingDay,
      remoteNextBillingAt: remoteNext,
      localNextBillingDate: subscription.next_billing_date,
      afterCatchUpCharge: chargedOverdue,
    });

    // 2) Sincroniza no gateway se ainda não sincronizou.
    if (!pagarmeBillingDateSynced) {
      try {
        const sync = await trySyncPagarmeBillingDate(
          pagarmeSubscriptionId,
          nextBillingDate
        );
        nextBillingDate = sync.nextBillingDate;
        pagarmeBillingDateSynced = sync.synced;

        if (sync.blockedByBilledPeriod) {
          console.warn(
            '[pagarme] billing-date blocked (412); syncing local only:',
            input.subscriptionId,
            formatPagarmeDate(nextBillingDate)
          );
        }
      } catch (error) {
        // Erros não-412 ainda sincronizam local se já cobramos (não deixar past_due).
        if (!chargedOverdue && subscription.status !== 'past_due') {
          return {
            status: 'error',
            error: userFacingPagarmeError(error),
            statusCode: 502,
          };
        }
        console.error(
          '[pagarme] billing-date patch failed; continuing with local sync:',
          input.subscriptionId,
          error
        );
        pagarmeBillingDateSynced = false;
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
          : `Não foi possível salvar a nova data localmente (${local.error}).`,
        statusCode: 502,
      };
    }

    const dayLabel = String(billingDay).padStart(2, '0');
    let message: string;
    if (chargedOverdue && pagarmeBillingDateSynced) {
      message = `Atraso cobrado e próximo vencimento remarcado para todo dia ${dayLabel}.`;
    } else if (pagarmeBillingDateSynced) {
      message = `Próximo vencimento remarcado para todo dia ${dayLabel}.`;
    } else if (chargedOverdue) {
      message =
        `Atraso cobrado e sistema atualizado para dia ${dayLabel} (${formatPagarmeDate(nextBillingDate)}). ` +
        `O Pagar.me bloqueou a alteração da data neste período. ` +
        `Confira no painel Pagar.me a próxima cobrança automática.`;
    } else {
      message =
        `Sistema atualizado para dia ${dayLabel} (${formatPagarmeDate(nextBillingDate)}). ` +
        `O Pagar.me bloqueou a alteração neste período (já faturado). ` +
        `Confira no painel Pagar.me se a próxima cobrança automática está no dia correto.`;
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
