import type { SupabaseClient } from '@supabase/supabase-js';
import {
  adminNotificationDefaultTitle,
  type AdminNotificationCategory,
} from '@/lib/admin/notification-display';
import {
  createAdminNotification,
  type AdminNotificationType,
} from '@/lib/admin/notifications';
import { formatMoney } from '@/lib/dashboard/format';
import { relOne } from '@/lib/dashboard/format';

export type SubscriptionAdminNotificationType = Extract<
  AdminNotificationType,
  | 'subscription_pending'
  | 'subscription_activated'
  | 'subscription_payment_failed'
  | 'subscription_renewal_paid'
  | 'subscription_cancelled'
>;

function formatPaymentMethodLabel(method?: string | null): string {
  if (!method) return '—';
  if (method === 'credit_card') return 'Cartão';
  if (method === 'pix') return 'PIX';
  return method;
}

function formatGatewayLabel(gateway?: string | null): string {
  if (gateway === 'pagarme') return 'Pagar.me';
  if (gateway === 'asaas') return 'Asaas';
  if (gateway === 'stripe') return 'Stripe';
  return gateway ?? '—';
}

function resolveSubscriptionGateway(subscription: {
  pagarme_subscription_id?: string | null;
  asaas_subscription_id?: string | null;
  stripe_subscription_id?: string | null;
}): string | null {
  if (subscription.pagarme_subscription_id) return 'pagarme';
  if (subscription.asaas_subscription_id) return 'asaas';
  if (subscription.stripe_subscription_id) return 'stripe';
  return null;
}

async function loadSubscriptionContext(
  admin: SupabaseClient,
  subscriptionId: string,
  userId: string
) {
  const [{ data: profile }, { data: subscription }] = await Promise.all([
    admin
      .from('profiles')
      .select('full_name, display_name, email')
      .eq('id', userId)
      .maybeSingle(),
    admin
      .from('subscriptions')
      .select(
        `
        id,
        pagarme_subscription_id,
        asaas_subscription_id,
        stripe_subscription_id,
        plans!plan_id(name, slug)
      `
      )
      .eq('id', subscriptionId)
      .maybeSingle(),
  ]);

  const plan = relOne(subscription?.plans);
  const customerLabel =
    profile?.display_name?.trim() ||
    profile?.full_name?.trim() ||
    profile?.email?.trim() ||
    'Cliente';

  return {
    customerLabel,
    customerEmail: profile?.email ?? null,
    planName: (plan?.name as string | undefined) ?? 'Assinatura',
    planSlug: (plan?.slug as string | undefined) ?? null,
    gateway: subscription ? resolveSubscriptionGateway(subscription) : null,
  };
}

export async function notifyAdminSubscriptionEvent(
  admin: SupabaseClient,
  input: {
    type: SubscriptionAdminNotificationType;
    subscriptionId: string;
    userId: string;
    paymentId?: string | null;
    amountCents?: number | null;
    paymentMethod?: string | null;
    gateway?: string | null;
    detail?: string | null;
    cycleNumber?: number | null;
    planName?: string | null;
  }
): Promise<void> {
  const context = await loadSubscriptionContext(
    admin,
    input.subscriptionId,
    input.userId
  );

  const planName = input.planName ?? context.planName;
  const gateway = input.gateway ?? context.gateway;
  const amountLabel =
    input.amountCents != null ? formatMoney(input.amountCents) : null;

  const bodyParts = [
    context.customerLabel,
    planName,
    amountLabel,
    input.cycleNumber != null ? `Ciclo ${input.cycleNumber}` : null,
    `${formatPaymentMethodLabel(input.paymentMethod)} · ${formatGatewayLabel(gateway)}`,
  ].filter(Boolean);

  if (input.detail?.trim()) {
    bodyParts.push(input.detail.trim());
  }

  const category: AdminNotificationCategory = 'subscription';

  await createAdminNotification(admin, {
    type: input.type,
    subscriptionId: input.subscriptionId,
    orderId: input.subscriptionId,
    userId: input.userId,
    paymentId: input.paymentId ?? null,
    title: adminNotificationDefaultTitle(input.type),
    body: bodyParts.join(' · '),
    amountCents: input.amountCents ?? null,
    paymentMethod: input.paymentMethod ?? null,
    gateway,
    metadata: {
      category,
      planName,
      planSlug: context.planSlug,
      customerEmail: context.customerEmail,
      customerName: context.customerLabel,
      cycleNumber: input.cycleNumber ?? null,
      ...(input.detail ? { detail: input.detail } : {}),
    },
  });
}
