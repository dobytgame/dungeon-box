import type { SupabaseClient } from '@supabase/supabase-js';
import { relOne } from '@/lib/dashboard/format';
import {
  buildPendingPaymentWhatsAppMessage,
  buildWhatsAppShareUrl,
  resolvePendingPaymentLinkForPayment,
  resolvePendingPaymentLinkForSubscription,
  type PendingPaymentLink,
} from '@/lib/payments/pending-payment-link';

export type AdminPendingPaymentPanelData = {
  subscriptionId?: string;
  paymentId?: string;
  customerName: string | null;
  customerPhone: string | null;
  planName: string | null;
  link: PendingPaymentLink;
  whatsappMessage: string;
  whatsappUrl: string;
};

export async function buildAdminPendingPaymentPanel(
  admin: SupabaseClient,
  input: { subscriptionId?: string; paymentId?: string }
): Promise<AdminPendingPaymentPanelData | null> {
  const linkResult = input.paymentId
    ? await resolvePendingPaymentLinkForPayment(admin, input.paymentId)
    : input.subscriptionId
      ? await resolvePendingPaymentLinkForSubscription(admin, input.subscriptionId)
      : null;

  if (!linkResult?.ok) return null;

  let customerName: string | null = null;
  let customerPhone: string | null = null;
  let planName: string | null = null;
  let userId: string | null = null;

  if (input.paymentId) {
    const { data } = await admin
      .from('payments')
      .select(
        `
        user_id,
        profiles(full_name, display_name, phone),
        subscriptions(plans!plan_id(name))
      `
      )
      .eq('id', input.paymentId)
      .maybeSingle();

    const profile = relOne(
      data?.profiles as
        | { full_name?: string | null; display_name?: string | null; phone?: string | null }
        | null
    );
    customerName = profile?.full_name ?? profile?.display_name ?? null;
    customerPhone = profile?.phone ?? null;
    userId = (data?.user_id as string | null) ?? null;
    const subscription = relOne(
      data?.subscriptions as { plans?: { name?: string } | { name?: string }[] | null } | null
    );
    planName = relOne(subscription?.plans as { name?: string } | { name?: string }[] | null)?.name ?? null;
  } else if (input.subscriptionId) {
    const { data } = await admin
      .from('subscriptions')
      .select(
        `
        user_id,
        profiles(full_name, display_name, phone),
        plans!plan_id(name)
      `
      )
      .eq('id', input.subscriptionId)
      .maybeSingle();

    const profile = relOne(
      data?.profiles as
        | { full_name?: string | null; display_name?: string | null; phone?: string | null }
        | null
    );
    customerName = profile?.full_name ?? profile?.display_name ?? null;
    customerPhone = profile?.phone ?? null;
    userId = (data?.user_id as string | null) ?? null;
    planName = relOne(data?.plans as { name?: string } | { name?: string }[] | null)?.name ?? null;
  }

  const whatsappMessage = buildPendingPaymentWhatsAppMessage({
    customerName,
    planName,
    amountCents: linkResult.link.amountCents,
    paymentUrl: linkResult.link.url,
  });

  return {
    subscriptionId: input.subscriptionId,
    paymentId: input.paymentId,
    customerName,
    customerPhone,
    planName,
    link: linkResult.link,
    whatsappMessage,
    whatsappUrl: buildWhatsAppShareUrl(whatsappMessage, customerPhone),
  };
}
