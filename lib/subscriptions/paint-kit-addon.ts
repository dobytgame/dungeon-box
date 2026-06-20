import type { PaintKitBumpId } from '@/lib/checkout/order-bumps';
import { getPaintKitBump } from '@/lib/checkout/order-bumps';
import { setPaintKitBumpInNotes } from '@/lib/checkout/special-notes';
import { getOrCreateAsaasCustomer } from '@/lib/asaas/customer';
import { isAsaasPaymentConfirmed } from '@/lib/asaas/payment-status';
import { chargeAsaasOneTimePayment } from '@/lib/asaas/one-time-payment';
import { updateAsaasSubscriptionDetails } from '@/lib/asaas/subscription-api';
import type {
  AsaasCreditCardHolderInput,
  AsaasCreditCardInput,
} from '@/lib/asaas/subscription-checkout';
import type { SupabaseClient } from '@supabase/supabase-js';

import { subscriptionEligibleForPaintKitAddon } from '@/lib/subscriptions/paint-kit-addon-shared';

type PlanRow = {
  id: string;
  name: string;
  price_cents: number;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  status: string;
  special_notes: string | null;
  asaas_subscription_id: string | null;
  asaas_customer_id: string | null;
  shipping_cents: number | null;
  address_id: string | null;
  plans: PlanRow | PlanRow[] | null;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  cpf: string | null;
  phone: string | null;
  asaas_customer_id: string | null;
};

type AddressRow = {
  recipient: string;
  zip_code: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
};

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function computeRecurringCents(
  plan: PlanRow,
  shippingCents: number,
  bumpCents: number
): number {
  return plan.price_cents + shippingCents + bumpCents;
}

export async function purchasePaintKitAddon(input: {
  supabase: SupabaseClient;
  userId: string;
  subscriptionId: string;
  bumpId: PaintKitBumpId;
  recurring: boolean;
  creditCard: AsaasCreditCardInput;
  creditCardHolderInfo: AsaasCreditCardHolderInput;
  remoteIp: string;
}): Promise<{ success: true } | { error: string }> {
  const bump = getPaintKitBump(input.bumpId);
  if (!bump) {
    return { error: 'Kit de pintura inválido.' };
  }

  const { data: subscription, error: subError } = await input.supabase
    .from('subscriptions')
    .select(
      `
      id,
      user_id,
      status,
      special_notes,
      asaas_subscription_id,
      asaas_customer_id,
      shipping_cents,
      address_id,
      plans!plan_id(id, name, price_cents)
    `
    )
    .eq('id', input.subscriptionId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (subError || !subscription) {
    return { error: 'Assinatura não encontrada.' };
  }

  const sub = subscription as SubscriptionRow;

  if (!subscriptionEligibleForPaintKitAddon(sub)) {
    if (sub.status !== 'active' && sub.status !== 'past_due') {
      return { error: 'Só assinaturas ativas podem adicionar o kit de pintura.' };
    }
    return { error: 'Esta assinatura já possui kit de pintura.' };
  }

  const plan = relOne(sub.plans);
  if (!plan) {
    return { error: 'Plano da assinatura não encontrado.' };
  }

  const { data: profile } = await input.supabase
    .from('profiles')
    .select('id, email, full_name, cpf, phone, asaas_customer_id')
    .eq('id', input.userId)
    .single();

  if (!profile?.email) {
    return { error: 'Complete seu perfil antes de comprar o kit.' };
  }

  const { data: address } = sub.address_id
    ? await input.supabase
        .from('addresses')
        .select(
          'recipient, zip_code, street, number, complement, neighborhood, city, state'
        )
        .eq('id', sub.address_id)
        .eq('user_id', input.userId)
        .maybeSingle()
    : { data: null };

  if (!address) {
    return { error: 'Cadastre um endereço de entrega antes de comprar o kit.' };
  }

  const profileRow = profile as ProfileRow;
  const addressRow = address as AddressRow;

  const asaasCustomerId = await getOrCreateAsaasCustomer(
    input.supabase,
    profileRow,
    addressRow
  );

  const now = new Date().toISOString();
  const specialNotes = setPaintKitBumpInNotes(
    sub.special_notes,
    input.bumpId,
    input.recurring
  );

  if (input.recurring) {
    if (!sub.asaas_subscription_id) {
      return {
        error:
          'Não foi possível incluir o kit na cobrança recorrente. Entre em contato com o suporte.',
      };
    }

    const shippingCents = sub.shipping_cents ?? 0;
    const recurringCents = computeRecurringCents(
      plan,
      shippingCents,
      bump.priceCents
    );

    try {
      await updateAsaasSubscriptionDetails(sub.asaas_subscription_id, {
        valueCents: recurringCents,
        description: `DungeonBox — ${plan.name} + ${bump.name}`,
      });
    } catch (error) {
      console.error('[paint-kit] asaas recurring update:', error);
      return {
        error:
          'Não foi possível atualizar a assinatura no gateway. Tente novamente.',
      };
    }

    const { error: updateError } = await input.supabase
      .from('subscriptions')
      .update({
        special_notes: specialNotes,
        updated_at: now,
      })
      .eq('id', sub.id)
      .eq('user_id', input.userId);

    if (updateError) {
      return { error: updateError.message };
    }

    return { success: true };
  }

  try {
    const payment = await chargeAsaasOneTimePayment({
      customerId: asaasCustomerId,
      valueCents: bump.priceCents,
      description: `DungeonBox — ${bump.name} (próxima caixa)`,
      remoteIp: input.remoteIp,
      creditCard: input.creditCard,
      creditCardHolderInfo: input.creditCardHolderInfo,
      externalReference: `${sub.id}:paint-kit:${input.bumpId}`,
    });

    const approved = isAsaasPaymentConfirmed(payment.status);
    const paidAt = approved ? now : null;

    const { error: paymentError } = await input.supabase.from('payments').upsert(
      {
        user_id: input.userId,
        subscription_id: sub.id,
        asaas_payment_id: payment.id,
        amount_cents: bump.priceCents,
        currency: 'BRL',
        status: approved ? 'approved' : 'pending',
        paid_at: paidAt,
      },
      { onConflict: 'asaas_payment_id' }
    );

    if (paymentError) {
      console.error('[paint-kit] payment record:', paymentError);
    }

    if (!approved) {
      return {
        error:
          'Pagamento em processamento. Assim que o gateway confirmar, o kit será vinculado à sua próxima caixa.',
      };
    }

    const { error: updateError } = await input.supabase
      .from('subscriptions')
      .update({
        special_notes: specialNotes,
        updated_at: now,
      })
      .eq('id', sub.id)
      .eq('user_id', input.userId);

    if (updateError) {
      return { error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[paint-kit] one-time charge:', error);
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Não foi possível processar o pagamento do kit.',
    };
  }
}
