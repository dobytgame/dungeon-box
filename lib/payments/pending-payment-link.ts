import type { SupabaseClient } from '@supabase/supabase-js';
import {
  asaasPaymentShareUrl,
  fetchAsaasPaymentDetails,
  isAsaasPaymentPending,
} from '@/lib/asaas/payment-details';
import { listAsaasSubscriptionPayments } from '@/lib/asaas/payment-sync';
import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { getSiteUrl } from '@/lib/email/config';
import { formatCurrencyBrl, greetingName } from '@/lib/email/layout';
import { getStripe, STRIPE_CONFIGURED } from '@/lib/stripe/server';
import type { PaymentStatus } from '@/lib/dashboard/types';

const LOCAL_PENDING_STATUSES = new Set<PaymentStatus>([
  'pending',
  'in_process',
  'authorized',
]);

export type PendingPaymentLinkSource = 'asaas' | 'stripe' | 'dashboard';

export type PendingPaymentLink = {
  url: string;
  amountCents: number;
  description: string;
  source: PendingPaymentLinkSource;
  paymentId?: string;
  dueDate?: string | null;
};

export type PendingPaymentLinkError = {
  code:
    | 'not_found'
    | 'not_pending'
    | 'no_gateway'
    | 'no_link'
    | 'partner'
    | 'gateway_error';
  message: string;
};

export type PendingPaymentLinkResult =
  | { ok: true; link: PendingPaymentLink }
  | { ok: false; error: PendingPaymentLinkError };

function dashboardSubscriptionUrl(): string {
  return `${getSiteUrl()}/dashboard/subscription`;
}

function centsFromReais(value?: number | null): number {
  return Math.round((value ?? 0) * 100);
}

async function resolveAsaasPaymentLink(
  asaasPaymentId: string
): Promise<PendingPaymentLink | null> {
  if (!ASAAS_CONFIGURED) return null;

  const remote = await fetchAsaasPaymentDetails(asaasPaymentId);
  if (!isAsaasPaymentPending(remote.status)) return null;

  const url = asaasPaymentShareUrl(remote);
  if (!url) return null;

  return {
    url,
    amountCents: centsFromReais(remote.value),
    description: remote.description?.trim() || 'Pagamento DungeonBox',
    source: 'asaas',
    dueDate: remote.dueDate ?? null,
  };
}

async function resolveStripeInvoiceLink(
  stripeInvoiceId: string
): Promise<PendingPaymentLink | null> {
  if (!STRIPE_CONFIGURED) return null;

  const stripe = getStripe();
  const invoice = await stripe.invoices.retrieve(stripeInvoiceId);
  if (invoice.status !== 'open' || !invoice.hosted_invoice_url) return null;

  return {
    url: invoice.hosted_invoice_url,
    amountCents: invoice.amount_due ?? 0,
    description: invoice.description?.trim() || 'Pagamento DungeonBox',
    source: 'stripe',
    dueDate: invoice.due_date
      ? new Date(invoice.due_date * 1000).toISOString().slice(0, 10)
      : null,
  };
}

async function resolveStripeSubscriptionLink(
  stripeSubscriptionId: string
): Promise<PendingPaymentLink | null> {
  if (!STRIPE_CONFIGURED) return null;

  const stripe = getStripe();
  const invoices = await stripe.invoices.list({
    subscription: stripeSubscriptionId,
    status: 'open',
    limit: 1,
  });

  const invoice = invoices.data[0];
  if (!invoice?.hosted_invoice_url) return null;

  return {
    url: invoice.hosted_invoice_url,
    amountCents: invoice.amount_due ?? 0,
    description: invoice.description?.trim() || 'Pagamento DungeonBox',
    source: 'stripe',
    dueDate: invoice.due_date
      ? new Date(invoice.due_date * 1000).toISOString().slice(0, 10)
      : null,
  };
}

async function findLatestLocalPendingPayment(
  supabase: SupabaseClient,
  subscriptionId: string
) {
  const { data } = await supabase
    .from('payments')
    .select(
      'id, amount_cents, status, asaas_payment_id, stripe_invoice_id, stripe_payment_intent_id, status_detail'
    )
    .eq('subscription_id', subscriptionId)
    .in('status', Array.from(LOCAL_PENDING_STATUSES))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

async function resolveFromLocalPaymentRow(
  supabase: SupabaseClient,
  row: {
    id: string;
    amount_cents: number;
    status: PaymentStatus;
    asaas_payment_id?: string | null;
    stripe_invoice_id?: string | null;
    status_detail?: string | null;
  }
): Promise<PendingPaymentLinkResult> {
  if (!LOCAL_PENDING_STATUSES.has(row.status)) {
    return {
      ok: false,
      error: {
        code: 'not_pending',
        message: 'Este pagamento não está pendente.',
      },
    };
  }

  if (row.asaas_payment_id) {
    try {
      const link = await resolveAsaasPaymentLink(row.asaas_payment_id);
      if (link) {
        return { ok: true, link: { ...link, paymentId: row.id } };
      }
    } catch (error) {
      console.error('[payments] asaas link failed:', error);
      return {
        ok: false,
        error: {
          code: 'gateway_error',
          message: 'Não foi possível obter o link no Asaas.',
        },
      };
    }
  }

  if (row.stripe_invoice_id) {
    try {
      const link = await resolveStripeInvoiceLink(row.stripe_invoice_id);
      if (link) {
        return { ok: true, link: { ...link, paymentId: row.id } };
      }
    } catch (error) {
      console.error('[payments] stripe invoice link failed:', error);
      return {
        ok: false,
        error: {
          code: 'gateway_error',
          message: 'Não foi possível obter o link no Stripe.',
        },
      };
    }
  }

  return {
    ok: true,
    link: {
      url: dashboardSubscriptionUrl(),
      amountCents: row.amount_cents,
      description: 'Pagamento DungeonBox',
      source: 'dashboard',
      paymentId: row.id,
    },
  };
}

export async function resolvePendingPaymentLinkForPayment(
  supabase: SupabaseClient,
  paymentId: string
): Promise<PendingPaymentLinkResult> {
  const { data: payment } = await supabase
    .from('payments')
    .select(
      'id, amount_cents, status, asaas_payment_id, stripe_invoice_id, stripe_payment_intent_id, status_detail, subscription_id'
    )
    .eq('id', paymentId)
    .maybeSingle();

  if (!payment) {
    return {
      ok: false,
      error: { code: 'not_found', message: 'Pagamento não encontrado.' },
    };
  }

  return resolveFromLocalPaymentRow(supabase, payment as {
    id: string;
    amount_cents: number;
    status: PaymentStatus;
    asaas_payment_id?: string | null;
    stripe_invoice_id?: string | null;
    status_detail?: string | null;
  });
}

export async function resolvePendingPaymentLinkForSubscription(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<PendingPaymentLinkResult> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(
      `
      id,
      status,
      is_partner,
      asaas_subscription_id,
      stripe_subscription_id,
      plans!plan_id(name, price_cents)
    `
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) {
    return {
      ok: false,
      error: { code: 'not_found', message: 'Assinatura não encontrada.' },
    };
  }

  if (subscription.is_partner) {
    return {
      ok: false,
      error: {
        code: 'partner',
        message: 'Assinaturas de parceiro não possuem cobrança.',
      },
    };
  }

  if (
    subscription.status !== 'pending' &&
    subscription.status !== 'past_due'
  ) {
    return {
      ok: false,
      error: {
        code: 'not_pending',
        message: 'A assinatura não está com pagamento pendente.',
      },
    };
  }

  const localPending = await findLatestLocalPendingPayment(
    supabase,
    subscriptionId
  );
  if (localPending) {
    const fromLocal = await resolveFromLocalPaymentRow(supabase, localPending as {
      id: string;
      amount_cents: number;
      status: PaymentStatus;
      asaas_payment_id?: string | null;
      stripe_invoice_id?: string | null;
      status_detail?: string | null;
    });
    if (fromLocal.ok && fromLocal.link.source !== 'dashboard') {
      return fromLocal;
    }
  }

  if (subscription.asaas_subscription_id && ASAAS_CONFIGURED) {
    try {
      const remotePayments = await listAsaasSubscriptionPayments(
        subscription.asaas_subscription_id
      );
      const pendingRemote = remotePayments.find((payment) =>
        isAsaasPaymentPending(payment.status)
      );

      if (pendingRemote?.id) {
        const link = await resolveAsaasPaymentLink(pendingRemote.id);
        if (link) {
          return {
            ok: true,
            link: {
              ...link,
              paymentId: localPending?.id as string | undefined,
            },
          };
        }
      }
    } catch (error) {
      console.error('[payments] asaas subscription payments failed:', error);
    }
  }

  if (subscription.stripe_subscription_id && STRIPE_CONFIGURED) {
    try {
      const link = await resolveStripeSubscriptionLink(
        subscription.stripe_subscription_id
      );
      if (link) {
        return {
          ok: true,
          link: {
            ...link,
            paymentId: localPending?.id as string | undefined,
          },
        };
      }
    } catch (error) {
      console.error('[payments] stripe subscription invoice failed:', error);
    }
  }

  const plan = Array.isArray(subscription.plans)
    ? subscription.plans[0]
    : subscription.plans;

  return {
    ok: true,
    link: {
      url: dashboardSubscriptionUrl(),
      amountCents:
        localPending?.amount_cents ??
        (plan?.price_cents as number | undefined) ??
        0,
      description: plan?.name
        ? `Assinatura DungeonBox — ${plan.name}`
        : 'Assinatura DungeonBox',
      source: 'dashboard',
      paymentId: localPending?.id as string | undefined,
    },
  };
}

export function buildWhatsAppShareUrl(message: string, phone?: string | null): string {
  const text = encodeURIComponent(message);
  const digits = phone?.replace(/\D/g, '');
  if (digits) return `https://wa.me/${digits}?text=${text}`;
  return `https://wa.me/?text=${text}`;
}

export function buildPendingPaymentWhatsAppMessage(input: {
  customerName?: string | null;
  planName?: string | null;
  amountCents: number;
  paymentUrl: string;
}): string {
  const name = greetingName(input.customerName);
  const amount = formatCurrencyBrl(input.amountCents);
  const planLine = input.planName ? ` (${input.planName})` : '';

  return [
    `Olá ${name}! 👋`,
    '',
    `Sua assinatura DungeonBox${planLine} está com pagamento pendente de ${amount}.`,
    '',
    `Finalize aqui: ${input.paymentUrl}`,
    '',
    'Qualquer dúvida, estamos à disposição! ⚔️',
  ].join('\n');
}
