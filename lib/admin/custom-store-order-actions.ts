'use server';

import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/lib/admin/audit';
import { requireAdmin } from '@/lib/admin/auth';
import {
  getCustomOrderCustomer,
  searchCustomOrderCustomers,
} from '@/lib/admin/custom-store-order';
import { parseBRLToCents } from '@/lib/store/parse-brl';
import { createCustomStoreOrder } from '@/lib/store/custom-order';
import { buildCustomStoreOrderPayUrl } from '@/lib/store/custom-order-token';
import { sendCustomStoreOrderPaymentEmail } from '@/lib/email/send-transactional';
import {
  findStoreOrderPaymentRowByOrderId,
  parseStoreOrderMeta,
} from '@/lib/asaas/store-order-payment';
import { headers } from 'next/headers';

async function clientIp(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || null;
  }
  return headerList.get('x-real-ip');
}

export async function searchCustomOrderCustomersAction(query: string) {
  const { admin } = await requireAdmin();
  return searchCustomOrderCustomers(admin, query);
}

export async function getCustomOrderCustomerAction(userId: string) {
  const { admin } = await requireAdmin();
  return getCustomOrderCustomer(admin, userId);
}

export async function adminCreateCustomStoreOrderAction(formData: FormData) {
  const { user, admin } = await requireAdmin();

  const userId = String(formData.get('user_id') ?? '').trim();
  const addressId = String(formData.get('address_id') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim() || null;
  const sendEmail = formData.get('send_email') !== '0';
  const itemsRaw = String(formData.get('items') ?? '').trim();

  if (!userId) {
    return { error: 'Selecione um cliente.' };
  }
  if (!addressId) {
    return { error: 'Selecione um endereço de entrega.' };
  }

  let parsedItems: Array<{
    name: string;
    quantity: number;
    unitPrice: string;
  }> = [];
  try {
    parsedItems = JSON.parse(itemsRaw) as typeof parsedItems;
  } catch {
    return { error: 'Itens inválidos.' };
  }

  const items = parsedItems
    .map((item) => {
      const unitPriceCents = parseBRLToCents(item.unitPrice);
      return {
        name: item.name,
        quantity: Number(item.quantity) || 1,
        unitPriceCents: unitPriceCents ?? 0,
      };
    })
    .filter((item) => item.name.trim() && item.unitPriceCents > 0);

  if (items.length === 0) {
    return { error: 'Informe ao menos um item com nome e valor.' };
  }

  try {
    const result = await createCustomStoreOrder(admin, {
      userId,
      addressId,
      items,
      notes,
      sendEmail,
    });

    if ('error' in result) {
      return { error: result.error };
    }

    await logAdminAction(admin, {
      actorId: user.id,
      action: 'store_order.custom_create',
      entityType: 'payment',
      entityId: result.paymentId,
      metadata: {
        user_id: userId,
        order_id: result.orderId,
        amount_cents: result.amountCents,
        email_sent: result.emailSent,
        item_count: items.length,
      },
      ipAddress: await clientIp(),
    });

    revalidatePath('/admin/loja/pedidos');
    revalidatePath(`/admin/clientes/${userId}`);
    revalidatePath('/admin/ciclos');

    return { success: true as const, ...result };
  } catch (error) {
    console.error('[admin] custom store order:', error);
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Não foi possível criar o pedido.',
    };
  }
}

export async function adminCustomStoreOrderPayLinkAction(orderId: string) {
  await requireAdmin();
  const trimmed = orderId.trim();
  if (!trimmed) {
    return { error: 'Pedido inválido.' };
  }
  return { url: buildCustomStoreOrderPayUrl(trimmed) };
}

export async function adminResendCustomStoreOrderEmailAction(orderId: string) {
  const { user, admin } = await requireAdmin();
  const paymentRow = await findStoreOrderPaymentRowByOrderId(admin, orderId);
  const meta = parseStoreOrderMeta(paymentRow?.status_detail);
  if (!paymentRow?.user_id || !meta) {
    return { error: 'Pedido não encontrado.' };
  }
  if (paymentRow.status === 'approved') {
    return { error: 'Este pedido já foi pago.' };
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('id', paymentRow.user_id)
    .maybeSingle();

  if (!profile?.email) {
    return { error: 'Cliente sem e-mail.' };
  }

  const paymentUrl = buildCustomStoreOrderPayUrl(meta.orderId);
  const sent = await sendCustomStoreOrderPaymentEmail({
    to: profile.email,
    name: profile.full_name,
    amountCents: paymentRow.amount_cents ?? 0,
    paymentUrl,
    items: meta.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
    })),
    notes: meta.productionNotes ?? null,
  });

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'store_order.custom_resend',
    entityType: 'payment',
    entityId: paymentRow.id,
    metadata: { order_id: meta.orderId, email_sent: sent.sent },
    ipAddress: await clientIp(),
  });

  if (!sent.sent) {
    return { error: 'Não foi possível enviar o e-mail.', url: paymentUrl };
  }

  return { success: true as const, url: paymentUrl };
}
