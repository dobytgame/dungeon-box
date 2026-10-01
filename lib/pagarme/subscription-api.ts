import { pagarmeRequest } from '@/lib/pagarme/client';
import { buildPagarmeSubscriptionCardPayload } from '@/lib/pagarme/subscription-card-payload';

type PagarmeSubscriptionResponse = {
  id: string;
  status?: string;
};

type PagarmeSubscriptionItem = {
  id?: string;
  status?: string | null;
  name?: string | null;
  description?: string | null;
  quantity?: number | null;
  pricing_scheme?: {
    scheme_type?: string | null;
    price?: number | null;
  } | null;
};

type PagarmeSubscriptionDetail = PagarmeSubscriptionResponse & {
  items?: PagarmeSubscriptionItem[];
};

type PagarmeDiscount = {
  id?: string;
  status?: string | null;
  discount_type?: string | null;
  value?: number | null;
};

type PagarmeInvoice = {
  id?: string;
  status?: string;
  charge?: { status?: string | null } | null;
};

const OPEN_INVOICE_STATUSES = new Set(['pending', 'scheduled', 'failed']);
const PAUSE_BILLING_MONTHS = 60;
const PAUSE_DISCOUNT_PERCENT = 100;

function addUtcMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate())
  );
}

function formatPagarmeDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isRemoteSubscriptionCanceled(status?: string | null): boolean {
  const value = status?.trim().toLowerCase() ?? '';
  return value === 'canceled' || value === 'cancelled';
}

function isBillingDateLocked(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /already been billed|already been started/i.test(message);
}

async function postponePagarmeBilling(
  pagarmeSubscriptionId: string,
  nextBillingAt: Date
): Promise<void> {
  const bodyDate = formatPagarmeDate(nextBillingAt);
  const encodedId = encodeURIComponent(pagarmeSubscriptionId);
  let billingDateError: unknown;

  try {
    await pagarmeRequest(`/subscriptions/${encodedId}/billing-date`, {
      method: 'PATCH',
      body: { next_billing_at: bodyDate },
    });
    return;
  } catch (error) {
    billingDateError = error;
  }

  try {
    await pagarmeRequest(`/subscriptions/${encodedId}/start-at`, {
      method: 'PATCH',
      body: { start_at: bodyDate },
    });
  } catch (error) {
    if (isBillingDateLocked(billingDateError) || isBillingDateLocked(error)) {
      throw billingDateError instanceof Error
        ? billingDateError
        : error;
    }
    throw error;
  }
}

async function fetchPagarmeSubscriptionDetail(
  pagarmeSubscriptionId: string
): Promise<PagarmeSubscriptionDetail> {
  return pagarmeRequest<PagarmeSubscriptionDetail>(
    `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}`
  );
}

async function setSubscriptionItemsStatus(
  pagarmeSubscriptionId: string,
  items: PagarmeSubscriptionItem[],
  status: 'active' | 'inactive'
): Promise<void> {
  for (const item of items) {
    if (!item.id) continue;
    if ((item.status?.trim().toLowerCase() || 'active') === status) continue;
    const price = item.pricing_scheme?.price;
    if (price == null) continue;

    await pagarmeRequest(
      `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}/items/${encodeURIComponent(item.id)}`,
      {
        method: 'PUT',
        body: {
          status,
          name: item.name ?? undefined,
          description: item.description ?? undefined,
          quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
          pricing_scheme: {
            scheme_type: item.pricing_scheme?.scheme_type || 'unit',
            price,
          },
        },
      }
    );
  }
}

async function listSubscriptionDiscounts(
  pagarmeSubscriptionId: string
): Promise<PagarmeDiscount[]> {
  const listed = await pagarmeRequest<{ data?: PagarmeDiscount[] }>(
    `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}/discounts`
  );
  return listed.data ?? [];
}

function isPauseDiscount(discount: PagarmeDiscount): boolean {
  return (
    discount.status?.trim().toLowerCase() === 'active' &&
    discount.discount_type?.trim().toLowerCase() === 'percentage' &&
    discount.value === PAUSE_DISCOUNT_PERCENT
  );
}

async function ensurePauseDiscount(pagarmeSubscriptionId: string): Promise<void> {
  const discounts = await listSubscriptionDiscounts(pagarmeSubscriptionId);
  if (discounts.some(isPauseDiscount)) return;

  await pagarmeRequest(
    `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}/discounts`,
    {
      method: 'POST',
      body: {
        value: PAUSE_DISCOUNT_PERCENT,
        discount_type: 'percentage',
      },
    }
  );
}

async function deletePauseDiscounts(pagarmeSubscriptionId: string): Promise<void> {
  const discounts = await listSubscriptionDiscounts(pagarmeSubscriptionId);
  for (const discount of discounts) {
    if (!discount.id || !isPauseDiscount(discount)) continue;
    await pagarmeRequest(
      `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}/discounts/${encodeURIComponent(discount.id)}`,
      { method: 'DELETE' }
    );
  }
}

/** Assinatura já iniciada não deixa remarcar a data. Segura o próximo ciclo sem cancelar. */
async function holdStartedPagarmeSubscription(
  pagarmeSubscriptionId: string,
  items: PagarmeSubscriptionItem[]
): Promise<void> {
  await setSubscriptionItemsStatus(pagarmeSubscriptionId, items, 'inactive');
  await ensurePauseDiscount(pagarmeSubscriptionId);
}

/** Remove faturas abertas/falhas para a próxima cobrança usar o cartão atual da assinatura. */
export async function cancelOpenPagarmeSubscriptionInvoices(
  pagarmeSubscriptionId: string
): Promise<void> {
  const listed = await pagarmeRequest<{ data?: PagarmeInvoice[] }>(
    `/invoices?subscription_id=${encodeURIComponent(pagarmeSubscriptionId)}&size=30&page=1`
  );

  for (const invoice of listed.data ?? []) {
    const status = invoice.status?.trim().toLowerCase() ?? '';
    if (!invoice.id || !OPEN_INVOICE_STATUSES.has(status)) continue;

    const chargeStatus = invoice.charge?.status?.trim().toLowerCase() ?? '';
    if (chargeStatus === 'paid') continue;

    await pagarmeRequest(`/invoices/${encodeURIComponent(invoice.id)}`, {
      method: 'DELETE',
    });
  }
}

/** Segura a recorrência sem cancelar a assinatura. A data local de retomada fica no banco. */
export async function pausePagarmeSubscriptionBilling(
  pagarmeSubscriptionId: string
): Promise<void> {
  const remote = await fetchPagarmeSubscriptionDetail(pagarmeSubscriptionId);
  if (isRemoteSubscriptionCanceled(remote.status)) return;

  await cancelOpenPagarmeSubscriptionInvoices(pagarmeSubscriptionId);

  try {
    await postponePagarmeBilling(
      pagarmeSubscriptionId,
      addUtcMonths(new Date(), PAUSE_BILLING_MONTHS)
    );
  } catch (error) {
    if (!isBillingDateLocked(error)) throw error;
    await holdStartedPagarmeSubscription(
      pagarmeSubscriptionId,
      remote.items ?? []
    );
  }
}

export async function resumePagarmeSubscriptionBilling(
  pagarmeSubscriptionId: string,
  nextBillingAt: Date
): Promise<void> {
  const remote = await fetchPagarmeSubscriptionDetail(pagarmeSubscriptionId);
  if (isRemoteSubscriptionCanceled(remote.status)) {
    throw new Error(
      'A assinatura está cancelada no Pagar.me e não pode ser retomada.'
    );
  }

  await setSubscriptionItemsStatus(
    pagarmeSubscriptionId,
    remote.items ?? [],
    'active'
  );
  await deletePauseDiscounts(pagarmeSubscriptionId);

  try {
    await postponePagarmeBilling(pagarmeSubscriptionId, nextBillingAt);
  } catch (error) {
    if (!isBillingDateLocked(error)) throw error;
  }
}

export async function cancelPagarmeSubscriptionBestEffort(
  pagarmeSubscriptionId: string
) {
  try {
    await pagarmeRequest<PagarmeSubscriptionResponse>(
      `/subscriptions/${pagarmeSubscriptionId}`,
      { method: 'DELETE' }
    );
  } catch (error) {
    console.warn(
      '[pagarme] could not cancel subscription:',
      pagarmeSubscriptionId,
      error
    );
  }
}

export async function fetchPagarmeSubscription(pagarmeSubscriptionId: string) {
  return pagarmeRequest<PagarmeSubscriptionResponse>(
    `/subscriptions/${pagarmeSubscriptionId}`
  );
}

export async function updatePagarmeSubscriptionCard(
  pagarmeSubscriptionId: string,
  input: {
    cardId?: string | null;
    cardToken?: string | null;
    billingAddress?: {
      line_1: string;
      line_2?: string;
      zip_code: string;
      city: string;
      state: string;
      country?: string;
    };
  }
) {
  const cardId = input.cardId?.trim() || null;
  const cardToken = input.cardToken?.trim() || null;

  if (!cardId && !cardToken) {
    throw new Error('Informe card_id ou card_token para a assinatura Pagar.me.');
  }

  if (!cardId && !input.billingAddress) {
    throw new Error('billingAddress é obrigatório com card_token.');
  }

  return pagarmeRequest<PagarmeSubscriptionResponse>(
    `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}/card`,
    {
      method: 'PATCH',
      body: buildPagarmeSubscriptionCardPayload({
        cardId,
        cardToken,
        billingAddress: input.billingAddress ?? {
          line_1: '-',
          zip_code: '00000000',
          city: '-',
          state: 'SP',
        },
      }),
    }
  );
}
