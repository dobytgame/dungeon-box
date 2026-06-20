import type { SupabaseClient } from '@supabase/supabase-js';
import { getOrCreateAsaasCustomer } from '@/lib/asaas/customer';
import { isAsaasPaymentConfirmed } from '@/lib/asaas/payment-status';
import { chargeAsaasOneTimePayment } from '@/lib/asaas/one-time-payment';
import { setPaintKitBumpInNotes } from '@/lib/checkout/special-notes';
import type {
  AsaasCreditCardHolderInput,
  AsaasCreditCardInput,
} from '@/lib/asaas/subscription-checkout';
import { subscriptionEligibleForPaintKitAddon } from '@/lib/subscriptions/paint-kit-addon-shared';
import type { CartLine } from '@/lib/store/cart';
import { cartSubtotalCents, normalizeCartLines, resolveCartLines } from '@/lib/store/cart';
import { getStoreProduct, type StoreProductId } from '@/lib/store/catalog';

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

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  cpf: string | null;
  phone: string | null;
  asaas_customer_id: string | null;
};

export type StoreCheckoutInput = {
  supabase: SupabaseClient;
  userId: string;
  items: CartLine[];
  addressId: string;
  bundleSubscriptionId?: string | null;
  creditCard: AsaasCreditCardInput;
  creditCardHolderInfo: AsaasCreditCardHolderInput;
  remoteIp: string;
};

export type StoreCheckoutResult =
  | { success: true; paymentId: string; orderId: string }
  | { error: string };

function buildOrderDescription(lines: ReturnType<typeof resolveCartLines>): string {
  const summary = lines.map((line) => `${line.quantity}x ${line.name}`).join(', ');
  return `DungeonBox Loja — ${summary}`;
}

function findPaintKitForBundle(
  items: CartLine[]
): { productId: StoreProductId; bumpId: 'amador' | 'profissional' } | null {
  const normalized = normalizeCartLines(items);
  const paintKits = normalized
    .map((line) => {
      const product = getStoreProduct(line.productId);
      if (!product?.paintKitBumpId || line.quantity !== 1) return null;
      return { productId: line.productId, bumpId: product.paintKitBumpId };
    })
    .filter(Boolean) as Array<{
    productId: StoreProductId;
    bumpId: 'amador' | 'profissional';
  }>;

  if (paintKits.length !== 1 || normalized.length !== 1) {
    return null;
  }

  return paintKits[0] ?? null;
}

export async function purchaseStoreOrder(
  input: StoreCheckoutInput
): Promise<StoreCheckoutResult> {
  const lines = resolveCartLines(input.items);
  if (lines.length === 0) {
    return { error: 'Seu carrinho está vazio.' };
  }

  const totalCents = cartSubtotalCents(input.items);
  if (totalCents <= 0) {
    return { error: 'Total inválido.' };
  }

  const { data: profile } = await input.supabase
    .from('profiles')
    .select('id, email, full_name, cpf, phone, asaas_customer_id')
    .eq('id', input.userId)
    .single();

  if (!profile?.email) {
    return { error: 'Complete seu perfil antes de comprar.' };
  }

  const { data: address } = await input.supabase
    .from('addresses')
    .select(
      'recipient, zip_code, street, number, complement, neighborhood, city, state'
    )
    .eq('id', input.addressId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (!address) {
    return { error: 'Endereço de entrega inválido.' };
  }

  let bundleSubscription: {
    id: string;
    status: string;
    special_notes: string | null;
  } | null = null;

  if (input.bundleSubscriptionId) {
    const paintKitBundle = findPaintKitForBundle(input.items);
    if (!paintKitBundle) {
      return {
        error:
          'Para enviar com a próxima caixa, adicione apenas um kit de pintura ao carrinho.',
      };
    }

    const { data: subscription } = await input.supabase
      .from('subscriptions')
      .select('id, status, special_notes')
      .eq('id', input.bundleSubscriptionId)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (!subscription || !subscriptionEligibleForPaintKitAddon(subscription)) {
      return {
        error:
          'Não foi possível vincular à assinatura. Verifique se ela está ativa e ainda não possui kit de pintura.',
      };
    }

    bundleSubscription = subscription;
  }

  const profileRow = profile as ProfileRow;
  const addressRow = address as AddressRow;
  const orderId = crypto.randomUUID();
  const now = new Date().toISOString();

  const asaasCustomerId = await getOrCreateAsaasCustomer(
    input.supabase,
    profileRow,
    addressRow
  );

  try {
    const payment = await chargeAsaasOneTimePayment({
      customerId: asaasCustomerId,
      valueCents: totalCents,
      description: buildOrderDescription(lines),
      remoteIp: input.remoteIp,
      creditCard: input.creditCard,
      creditCardHolderInfo: input.creditCardHolderInfo,
      externalReference: `store:${input.userId}:${orderId}`,
    });

    const approved = isAsaasPaymentConfirmed(payment.status);
    const paidAt = approved ? now : null;

    const orderMeta = {
      type: 'store_order',
      orderId,
      items: lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        name: line.name,
        lineTotalCents: line.lineTotalCents,
      })),
      addressId: input.addressId,
      bundleSubscriptionId: input.bundleSubscriptionId ?? null,
      shippingMode: input.bundleSubscriptionId ? 'with_subscription' : 'standalone',
    };

    const { data: paymentRow, error: paymentError } = await input.supabase
      .from('payments')
      .upsert(
        {
          user_id: input.userId,
          subscription_id: input.bundleSubscriptionId ?? null,
          asaas_payment_id: payment.id,
          amount_cents: totalCents,
          currency: 'BRL',
          status: approved ? 'approved' : 'pending',
          status_detail: JSON.stringify(orderMeta),
          paid_at: paidAt,
        },
        { onConflict: 'asaas_payment_id' }
      )
      .select('id')
      .single();

    if (paymentError) {
      console.error('[store] payment record:', paymentError);
    }

    if (!approved) {
      return {
        error:
          'Pagamento em processamento. Você receberá a confirmação em breve.',
      };
    }

    if (bundleSubscription) {
      const paintKitBundle = findPaintKitForBundle(input.items);
      if (paintKitBundle) {
        await input.supabase
          .from('subscriptions')
          .update({
            special_notes: setPaintKitBumpInNotes(
              bundleSubscription.special_notes,
              paintKitBundle.bumpId,
              false
            ),
            updated_at: now,
          })
          .eq('id', bundleSubscription.id)
          .eq('user_id', input.userId);
      }
    }

    return {
      success: true,
      paymentId: paymentRow?.id ?? payment.id,
      orderId,
    };
  } catch (error) {
    console.error('[store] checkout:', error);
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Não foi possível processar o pagamento.',
    };
  }
}
