import type { SupabaseClient } from '@supabase/supabase-js';
import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { getOrCreateAsaasCustomer } from '@/lib/asaas/customer';
import { userFacingAsaasError } from '@/lib/asaas/errors';
import {
  createAsaasPixPayment,
  fetchAsaasPixQrCode,
} from '@/lib/asaas/one-time-payment';
import {
  asaasPaymentShareUrl,
  fetchAsaasPaymentDetails,
  isAsaasPaymentPending,
} from '@/lib/asaas/payment-details';
import { isComboTerm, type BillingTerm } from '@/lib/checkout/combo-billing';
import { resolveSubscriptionMonthlyRevenueCents } from '@/lib/admin/subscription-monthly-revenue';
import { getSiteUrl } from '@/lib/email/config';
import { notifySubscriptionPixPayment } from '@/lib/email/subscription-pix-notify';
import { relOne } from '@/lib/dashboard/format';

export type PixRenewalPreview = {
  subscriptionId: string;
  amountCents: number;
  period: string;
  periodLabel: string;
  pendingPaymentId: string | null;
};

type PixRenewalDetail = {
  type: 'pix_renewal';
  period: string;
};

function brazilMonthKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return `${year}-${month}`;
}

export function pixRenewalPeriodKey(
  nextBillingDate: string | null | undefined,
  now = new Date()
): string {
  const current = brazilMonthKey(now);
  const billingMonth = nextBillingDate?.slice(0, 7) ?? null;
  if (!billingMonth || billingMonth < current) return current;
  return billingMonth;
}

export function pixRenewalPeriodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;
  const date = new Date(Date.UTC(year, month - 1, 15, 15));
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

function parsePixRenewalDetail(raw: string | null): PixRenewalDetail | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { type?: string; period?: string };
    if (parsed?.type === 'pix_renewal' && typeof parsed.period === 'string') {
      return { type: 'pix_renewal', period: parsed.period };
    }
  } catch {
    return null;
  }
  return null;
}

function serializePixRenewalDetail(period: string): string {
  return JSON.stringify({ type: 'pix_renewal', period } satisfies PixRenewalDetail);
}

function comboStillPrepaid(
  billingTerm: string | null | undefined,
  prepaidUntil: string | null | undefined,
  now = new Date()
): boolean {
  if (!billingTerm || !isComboTerm(billingTerm as BillingTerm)) return false;
  if (!prepaidUntil) return false;
  return new Date(prepaidUntil).getTime() > now.getTime();
}

function hasRecurringGateway(row: {
  asaas_subscription_id?: string | null;
  pagarme_subscription_id?: string | null;
  stripe_subscription_id?: string | null;
  mp_subscription_id?: string | null;
}): boolean {
  return Boolean(
    row.asaas_subscription_id ||
      row.pagarme_subscription_id ||
      row.stripe_subscription_id ||
      row.mp_subscription_id
  );
}

export async function getPixRenewalPreview(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<PixRenewalPreview | null> {
  const { data: subscription } = await admin
    .from('subscriptions')
    .select(
      `
      id,
      status,
      is_partner,
      billing_term,
      prepaid_until,
      next_billing_date,
      shipping_cents,
      special_notes,
      asaas_subscription_id,
      pagarme_subscription_id,
      stripe_subscription_id,
      mp_subscription_id,
      plans!plan_id(price_cents)
    `
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) return null;
  if (subscription.is_partner) return null;
  if (
    subscription.status !== 'active' &&
    subscription.status !== 'past_due'
  ) {
    return null;
  }
  if (hasRecurringGateway(subscription)) return null;
  if (
    comboStillPrepaid(
      subscription.billing_term as string | null,
      subscription.prepaid_until as string | null
    )
  ) {
    return null;
  }

  const { count } = await admin
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_id', subscriptionId)
    .eq('payment_method', 'pix');

  if (!count) return null;

  const plan = relOne(
    subscription.plans as { price_cents?: number } | { price_cents?: number }[] | null
  );
  const amountCents = resolveSubscriptionMonthlyRevenueCents({
    planPriceCents: plan?.price_cents ?? null,
    shippingCents: (subscription.shipping_cents as number | null) ?? null,
    specialNotes: (subscription.special_notes as string | null) ?? null,
  });
  if (amountCents == null || amountCents <= 0) return null;

  const period = pixRenewalPeriodKey(
    subscription.next_billing_date as string | null
  );
  const pending = await findPeriodPixPayment(admin, subscriptionId, period, [
    'pending',
  ]);

  return {
    subscriptionId,
    amountCents,
    period,
    periodLabel: pixRenewalPeriodLabel(period),
    pendingPaymentId: pending?.id ?? null,
  };
}

async function findPeriodPixPayment(
  admin: SupabaseClient,
  subscriptionId: string,
  period: string,
  statuses: string[]
): Promise<{
  id: string;
  asaas_payment_id: string | null;
  status: string;
  amount_cents: number;
} | null> {
  const { data } = await admin
    .from('payments')
    .select('id, asaas_payment_id, status, amount_cents, status_detail')
    .eq('subscription_id', subscriptionId)
    .eq('payment_method', 'pix')
    .in('status', statuses)
    .order('created_at', { ascending: false })
    .limit(20);

  for (const row of data ?? []) {
    const detail = parsePixRenewalDetail(row.status_detail as string | null);
    if (detail?.period === period) {
      return {
        id: row.id as string,
        asaas_payment_id: (row.asaas_payment_id as string | null) ?? null,
        status: row.status as string,
        amount_cents: (row.amount_cents as number) ?? 0,
      };
    }
  }

  return null;
}

export async function issuePixRenewalAndNotify(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<{
  paymentId: string;
  amountCents: number;
  period: string;
  periodLabel: string;
  reused: boolean;
  emailSent: boolean;
}> {
  if (!ASAAS_CONFIGURED) {
    throw new Error('Asaas não configurado.');
  }

  const { data: subscription } = await admin
    .from('subscriptions')
    .select(
      `
      id,
      user_id,
      status,
      is_partner,
      billing_term,
      prepaid_until,
      next_billing_date,
      shipping_cents,
      special_notes,
      address_id,
      asaas_subscription_id,
      pagarme_subscription_id,
      stripe_subscription_id,
      mp_subscription_id,
      asaas_customer_id,
      plans!plan_id(name, price_cents)
    `
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) {
    throw new Error('Assinatura não encontrada.');
  }
  if (subscription.is_partner) {
    throw new Error('Assinatura de parceiro não gera PIX.');
  }
  if (
    subscription.status !== 'active' &&
    subscription.status !== 'past_due'
  ) {
    throw new Error('A renovação PIX só vale para assinatura ativa ou em atraso.');
  }
  if (hasRecurringGateway(subscription)) {
    throw new Error(
      'Esta assinatura já cobra no cartão (recorrência no gateway). Use o link de pagamento pendente.'
    );
  }
  if (
    comboStillPrepaid(
      subscription.billing_term as string | null,
      subscription.prepaid_until as string | null
    )
  ) {
    throw new Error('Combo ainda está pré-pago — não há renovação mensal agora.');
  }

  const { count: pixCount } = await admin
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_id', subscriptionId)
    .eq('payment_method', 'pix');

  if (!pixCount) {
    throw new Error('Esta assinatura não tem histórico de pagamento PIX.');
  }

  const plan = relOne(
    subscription.plans as
      | { name?: string; price_cents?: number }
      | { name?: string; price_cents?: number }[]
      | null
  );
  const amountCents = resolveSubscriptionMonthlyRevenueCents({
    planPriceCents: plan?.price_cents ?? null,
    shippingCents: (subscription.shipping_cents as number | null) ?? null,
    specialNotes: (subscription.special_notes as string | null) ?? null,
  });
  if (amountCents == null || amountCents <= 0) {
    throw new Error('Não foi possível calcular o valor da renovação.');
  }

  const period = pixRenewalPeriodKey(
    subscription.next_billing_date as string | null
  );
  const periodLabel = pixRenewalPeriodLabel(period);
  const userId = subscription.user_id as string;

  const alreadyPaid = await findPeriodPixPayment(admin, subscriptionId, period, [
    'approved',
  ]);
  if (alreadyPaid) {
    throw new Error(`Já existe PIX pago para ${periodLabel}.`);
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, cpf, full_name, phone, asaas_customer_id')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.email) {
    throw new Error('Cliente sem e-mail cadastrado.');
  }

  let paymentId: string | null = null;
  let reused = false;
  let pixPayload: string | null = null;
  let expirationDate: string | null = null;
  let paymentUrl: string | null = null;

  const pending = await findPeriodPixPayment(admin, subscriptionId, period, [
    'pending',
  ]);

  if (pending?.asaas_payment_id) {
    try {
      const remote = await fetchAsaasPaymentDetails(pending.asaas_payment_id);
      if (isAsaasPaymentPending(remote.status)) {
        const pix = await fetchAsaasPixQrCode(pending.asaas_payment_id);
        if (pix.payload?.trim()) {
          paymentId = pending.id;
          reused = true;
          pixPayload = pix.payload;
          expirationDate = pix.expirationDate ?? null;
          paymentUrl =
            asaasPaymentShareUrl(remote) ??
            `${getSiteUrl()}/dashboard/subscription`;
        }
      } else {
        await admin
          .from('payments')
          .update({
            status: (remote.status ?? 'failed').toLowerCase(),
          })
          .eq('id', pending.id);
      }
    } catch (error) {
      console.error('[admin] pix renewal reuse failed:', error);
    }
  }

  if (!reused) {
    const addressId = subscription.address_id as string | null;
    if (!addressId) {
      throw new Error('Assinatura sem endereço de entrega.');
    }

    const { data: address } = await admin
      .from('addresses')
      .select(
        'recipient, zip_code, street, number, complement, neighborhood, city, state'
      )
      .eq('id', addressId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!address) {
      throw new Error('Endereço de entrega inválido.');
    }

    const cpf = profile.cpf?.replace(/\D/g, '') ?? '';
    if (cpf.length !== 11) {
      throw new Error('Cliente precisa ter CPF cadastrado para gerar PIX.');
    }
    const phone = profile.phone?.replace(/\D/g, '') ?? '';
    if (phone.length < 10) {
      throw new Error('Cliente precisa ter telefone cadastrado para gerar PIX.');
    }

    const asaasCustomerId = await getOrCreateAsaasCustomer(admin, profile, {
      recipient: address.recipient as string,
      zip_code: address.zip_code as string,
      street: address.street as string,
      number: address.number as string,
      complement: (address.complement as string | null) ?? null,
      neighborhood: address.neighborhood as string,
      city: address.city as string,
      state: address.state as string,
    });

    const planName = plan?.name ?? 'assinatura';
    let pixPayment;
    try {
      pixPayment = await createAsaasPixPayment({
        customerId: asaasCustomerId,
        valueCents: amountCents,
        description: `DungeonBox — ${planName} (renovação ${periodLabel})`,
        externalReference: `${subscriptionId}:pix-renewal:${period}`,
      });
    } catch (error) {
      throw new Error(userFacingAsaasError(error));
    }

    const { data: paymentRow, error: paymentError } = await admin
      .from('payments')
      .upsert(
        {
          user_id: userId,
          subscription_id: subscriptionId,
          asaas_payment_id: pixPayment.id,
          amount_cents: amountCents,
          currency: 'BRL',
          status: 'pending',
          payment_method: 'pix',
          installments: 1,
          status_detail: serializePixRenewalDetail(period),
        },
        { onConflict: 'asaas_payment_id' }
      )
      .select('id')
      .single();

    if (paymentError || !paymentRow) {
      throw new Error('Não foi possível registrar o PIX de renovação.');
    }

    const remote = await fetchAsaasPaymentDetails(pixPayment.id);
    paymentId = paymentRow.id as string;
    pixPayload = pixPayment.pix.payload;
    expirationDate = pixPayment.pix.expirationDate ?? null;
    paymentUrl =
      asaasPaymentShareUrl(remote) ?? `${getSiteUrl()}/dashboard/subscription`;
  }

  if (!paymentId || !pixPayload || !paymentUrl) {
    throw new Error('Não foi possível montar o PIX de renovação.');
  }

  const emailNotify = await notifySubscriptionPixPayment(admin, {
    userId,
    planName: plan?.name ?? null,
    amountCents,
    paymentUrl,
    pixPayload,
    expirationDate,
    purpose: 'renewal',
    periodLabel,
  });

  return {
    paymentId,
    amountCents,
    period,
    periodLabel,
    reused,
    emailSent: emailNotify.sent,
  };
}
