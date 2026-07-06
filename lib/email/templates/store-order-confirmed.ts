import { getSiteUrl } from '@/lib/email/config';
import {
  buildEmailHtml,
  buildEmailText,
  formatCurrencyBrl,
  greetingName,
} from '@/lib/email/layout';

export const STORE_ORDER_CONFIRMED_SUBJECT =
  'Pedido da loja confirmado — DungeonBox';

export interface StoreOrderConfirmedItem {
  name: string;
  quantity: number;
  lineTotalCents: number;
}

export interface StoreOrderConfirmedTemplateData {
  name?: string | null;
  orderId: string;
  items: StoreOrderConfirmedItem[];
  subtotalCents: number;
  shippingCents: number;
  shippingLabel?: string | null;
  amountCents: number;
  bundledWithSubscription?: boolean;
}

export function storeOrderConfirmedHtml(
  data: StoreOrderConfirmedTemplateData
): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();

  const shippingLine =
    data.shippingCents > 0
      ? `Frete: <strong style="color:#fff;">${formatCurrencyBrl(data.shippingCents)}</strong>${data.shippingLabel ? ` (${data.shippingLabel})` : ''}`
      : data.bundledWithSubscription
        ? 'Frete grátis — envio junto com a próxima caixa da assinatura.'
        : 'Frete grátis.';

  return buildEmailHtml({
    subject: STORE_ORDER_CONFIRMED_SUBJECT,
    preheader: `Pedido ${data.orderId.slice(0, 8)} confirmado. Total ${formatCurrencyBrl(data.amountCents)}.`,
    eyebrow: 'Loja',
    headline: 'Pedido confirmado.',
    headlineAccent: 'confirmado',
    paragraphs: [
      `${name}, recebemos o pagamento do seu pedido na loja DungeonBox.`,
      `Total: <strong style="color:#fff;">${formatCurrencyBrl(data.amountCents)}</strong>. ${shippingLine}`,
      data.bundledWithSubscription
        ? 'Itens vinculados à assinatura serão enviados na próxima caixa.'
        : 'Nossa equipe preparará o envio avulso em breve.',
    ],
    bullets: data.items.map(
      (item) =>
        `${item.quantity}x ${item.name} — ${formatCurrencyBrl(item.lineTotalCents)}`
    ),
    cta: { label: 'Ver pagamentos', href: `${siteUrl}/dashboard/payments` },
    secondaryCta: { label: 'Continuar comprando', href: `${siteUrl}/loja` },
    callout: {
      title: 'Referência',
      body: data.orderId,
    },
  });
}

export function storeOrderConfirmedText(
  data: StoreOrderConfirmedTemplateData
): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();
  const items = data.items
    .map(
      (item) =>
        `- ${item.quantity}x ${item.name}: ${formatCurrencyBrl(item.lineTotalCents)}`
    )
    .join('\n');

  return buildEmailText([
    `${name}, pedido da loja confirmado.`,
    items,
    `Subtotal: ${formatCurrencyBrl(data.subtotalCents)}`,
    data.shippingCents > 0
      ? `Frete: ${formatCurrencyBrl(data.shippingCents)}`
      : 'Frete grátis',
    `Total: ${formatCurrencyBrl(data.amountCents)}`,
    `Ref: ${data.orderId}`,
    `Pagamentos: ${siteUrl}/dashboard/payments`,
    `Loja: ${siteUrl}/loja`,
  ]);
}
