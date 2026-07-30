import type { StoreOrderMeta } from '@/lib/asaas/store-order-payment';
import type { SupabaseClient } from '@supabase/supabase-js';
import { signStoreCustomizationUrls } from '@/lib/store/customization-upload';

export interface AdminStoreOrderLineView {
  name: string;
  quantity: number;
  lineTotalCents: number;
  detail: string | null;
  customizationUploadPaths?: string[];
  customizationImageUrls?: string[];
}

export interface AdminStoreOrderPurchaseView {
  orderId: string;
  paymentId?: string;
  items: AdminStoreOrderLineView[];
  amountCents: number;
  shippingLabel: string | null;
  shippingCents: number | null;
  couponCode: string | null;
  couponDiscountCents: number | null;
}

function customizationPathsFromLine(
  line: StoreOrderMeta['items'][number]
): string[] {
  if (!Array.isArray(line.itemUploads)) return [];
  return line.itemUploads.filter(
    (path): path is string => typeof path === 'string' && path.trim().length > 0
  );
}

function describeStoreOrderLineDetail(
  line: StoreOrderMeta['items'][number]
): string | null {
  const uploads = customizationPathsFromLine(line);

  if (uploads.length > 0) {
    return `${uploads.length} imagem(ns) de personalização`;
  }

  const variationSummary =
    typeof line.variationSummary === 'string' ? line.variationSummary.trim() : '';
  if (variationSummary) return variationSummary;

  const planName = typeof line.planName === 'string' ? line.planName.trim() : '';
  const themeName = typeof line.themeName === 'string' ? line.themeName.trim() : '';
  const parts = [planName, themeName].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function storeOrderLinesFromMeta(
  meta: StoreOrderMeta
): AdminStoreOrderLineView[] {
  return meta.items.map((line) => {
    const uploadPaths = customizationPathsFromLine(line);
    return {
      name: line.name,
      quantity: line.quantity,
      lineTotalCents: line.lineTotalCents,
      detail: describeStoreOrderLineDetail(line),
      ...(uploadPaths.length > 0
        ? { customizationUploadPaths: uploadPaths }
        : {}),
    };
  });
}

export function storeOrderPurchaseFromMeta(
  paymentId: string,
  meta: StoreOrderMeta,
  amountCents: number
): AdminStoreOrderPurchaseView {
  return {
    orderId: meta.orderId,
    paymentId,
    items: storeOrderLinesFromMeta(meta),
    amountCents,
    shippingLabel: meta.shippingLabel ?? null,
    shippingCents: meta.shippingCents ?? null,
    couponCode: meta.couponCode ?? null,
    couponDiscountCents: meta.couponDiscountCents ?? null,
  };
}

export async function enrichStoreOrderPurchaseViews(
  admin: SupabaseClient,
  purchases: AdminStoreOrderPurchaseView[]
): Promise<AdminStoreOrderPurchaseView[]> {
  return Promise.all(
    purchases.map(async (purchase) => ({
      ...purchase,
      items: await Promise.all(
        purchase.items.map(async (item) => {
          if (!item.customizationUploadPaths?.length) return item;
          return {
            ...item,
            customizationImageUrls: await signStoreCustomizationUrls(
              admin,
              item.customizationUploadPaths
            ),
          };
        })
      ),
    }))
  );
}
