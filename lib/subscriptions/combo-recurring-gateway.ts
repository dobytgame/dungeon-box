import {
  isComboTerm,
  prepaidMonthsForTerm,
  type BillingTerm,
} from '@/lib/checkout/combo-billing';
import { pagarmeRequest } from '@/lib/pagarme/client';
import { truncatePagarmeItemDescription } from '@/lib/pagarme/item-description';

type PagarmeSubscriptionItem = {
  id?: string;
  status?: string;
  name?: string | null;
  description?: string | null;
  quantity?: number;
  pricing_scheme?: { scheme_type?: string; price?: number | null } | null;
};

type PagarmeSubscriptionDetail = {
  id: string;
  interval?: string;
  interval_count?: number;
  items?: PagarmeSubscriptionItem[];
};

export function asaasCycleForComboTerm(
  term: Exclude<BillingTerm, 'monthly'>
): 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY' {
  if (term === 'combo_3') return 'QUARTERLY';
  if (term === 'combo_6') return 'SEMIANNUALLY';
  return 'YEARLY';
}

export function pagarmeIntervalCountForComboTerm(
  term: Exclude<BillingTerm, 'monthly'>
): number {
  return prepaidMonthsForTerm(term) ?? 3;
}

function formatPagarmeDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function fetchPagarmeSubscriptionDetail(
  pagarmeSubscriptionId: string
): Promise<PagarmeSubscriptionDetail> {
  return pagarmeRequest<PagarmeSubscriptionDetail>(
    `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}`
  );
}

function pickPrimaryItem(items: PagarmeSubscriptionItem[]): PagarmeSubscriptionItem | null {
  const active = items.filter((item) => item.id);
  if (active.length === 0) return null;
  return active.reduce((best, item) => {
    const price = item.pricing_scheme?.price ?? 0;
    const bestPrice = best.pricing_scheme?.price ?? 0;
    return price >= bestPrice ? item : best;
  });
}

/** Alinha assinatura Pagar.me ao combo (cobrança a cada N meses, valor do pacote). */
export async function syncPagarmeSubscriptionComboRecurring(
  pagarmeSubscriptionId: string,
  input: {
    planName: string;
    billingTerm: Exclude<BillingTerm, 'monthly'>;
    comboTotalCents: number;
    nextBillingAt?: Date | null;
  }
): Promise<void> {
  if (!isComboTerm(input.billingTerm)) {
    throw new Error('Termo de combo inválido.');
  }
  if (input.comboTotalCents <= 0) {
    throw new Error('Valor do combo inválido.');
  }

  const intervalCount = pagarmeIntervalCountForComboTerm(input.billingTerm);
  const comboMonthsLabel =
    input.billingTerm === 'combo_3'
      ? '3 meses'
      : input.billingTerm === 'combo_6'
        ? '6 meses'
        : '12 meses';

  const patchBody: Record<string, unknown> = {
    interval: 'month',
    interval_count: intervalCount,
  };
  if (input.nextBillingAt) {
    patchBody.start_at = formatPagarmeDate(input.nextBillingAt);
    patchBody.billing_type = 'prepaid';
  }

  await pagarmeRequest(
    `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}`,
    { method: 'PUT', body: patchBody }
  );

  const remote = await fetchPagarmeSubscriptionDetail(pagarmeSubscriptionId);
  const item = pickPrimaryItem(remote.items ?? []);
  if (!item?.id) {
    throw new Error('Item da assinatura Pagar.me não encontrado.');
  }

  await pagarmeRequest(
    `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}/items/${encodeURIComponent(item.id)}`,
    {
      method: 'PUT',
      body: {
        status: item.status?.trim() || 'active',
        name: item.name ?? undefined,
        description: truncatePagarmeItemDescription(
          `DungeonBox — ${input.planName} (combo ${comboMonthsLabel} · renovação automática)`
        ),
        quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
        pricing_scheme: {
          scheme_type: 'unit',
          price: input.comboTotalCents,
        },
      },
    }
  );
}

/** Próxima cobrança mensal (perde desconto combo; ciclos já pagos permanecem). */
export async function syncPagarmeSubscriptionMonthlyRecurring(
  pagarmeSubscriptionId: string,
  input: {
    planName: string;
    monthlyTotalCents: number;
    nextBillingAt: Date;
    description?: string;
  }
): Promise<void> {
  if (input.monthlyTotalCents <= 0) {
    throw new Error('Valor mensal inválido.');
  }

  await pagarmeRequest(
    `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}`,
    {
      method: 'PUT',
      body: {
        interval: 'month',
        interval_count: 1,
        start_at: formatPagarmeDate(input.nextBillingAt),
        billing_type: 'prepaid',
      },
    }
  );

  const remote = await fetchPagarmeSubscriptionDetail(pagarmeSubscriptionId);
  const item = pickPrimaryItem(remote.items ?? []);
  if (!item?.id) {
    throw new Error('Item da assinatura Pagar.me não encontrado.');
  }

  await pagarmeRequest(
    `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}/items/${encodeURIComponent(item.id)}`,
    {
      method: 'PUT',
      body: {
        status: item.status?.trim() || 'active',
        name: item.name ?? undefined,
        description: truncatePagarmeItemDescription(
          input.description ??
            `DungeonBox — ${input.planName} (renovação mensal)`
        ),
        quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
        pricing_scheme: {
          scheme_type: 'unit',
          price: input.monthlyTotalCents,
        },
      },
    }
  );
}
