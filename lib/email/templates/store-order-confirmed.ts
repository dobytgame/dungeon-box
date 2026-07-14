import { getSiteUrl } from '@/lib/email/config';
import {
  buildEmailHtml,
  buildEmailText,
  escapeHtml,
  formatCurrencyBrl,
  greetingName,
  EMAIL_COLORS,
} from '@/lib/email/layout';
import { STORE_PRODUCTION_LEAD_TIME_LABEL } from '@/lib/store/production-lead-time';

export const STORE_ORDER_CONFIRMED_SUBJECT =
  'Pedido confirmado — DungeonBox';

export interface StoreOrderConfirmedItem {
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  variationSummary?: string | null;
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
  couponCode?: string | null;
  couponDiscountCents?: number;
}

function renderOrderItemsTable(items: StoreOrderConfirmedItem[]): string {
  const rows = items
    .map((item) => {
      const variation = item.variationSummary
        ? `<br /><span style="font-size:12px;color:${EMAIL_COLORS.muted};">${escapeHtml(item.variationSummary)}</span>`
        : '';

      return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid ${EMAIL_COLORS.border};font-size:14px;color:${EMAIL_COLORS.muted};vertical-align:top;width:48px;">
          ${item.quantity}×
        </td>
        <td style="padding:14px 12px 14px 0;border-bottom:1px solid ${EMAIL_COLORS.border};font-size:15px;line-height:1.5;color:${EMAIL_COLORS.text};vertical-align:top;">
          <strong style="color:#fff;font-weight:600;">${escapeHtml(item.name)}</strong>${variation}
          <br /><span style="font-size:12px;color:${EMAIL_COLORS.muted};">${formatCurrencyBrl(item.unitPriceCents)} cada</span>
        </td>
        <td style="padding:14px 0;border-bottom:1px solid ${EMAIL_COLORS.border};font-size:15px;color:#fff;text-align:right;vertical-align:top;white-space:nowrap;">
          ${formatCurrencyBrl(item.lineTotalCents)}
        </td>
      </tr>`;
    })
    .join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 20px;border-top:1px solid ${EMAIL_COLORS.border};">
      <tr>
        <td colspan="3" style="padding:16px 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${EMAIL_COLORS.muted};font-weight:600;">
          Itens do pedido
        </td>
      </tr>
      ${rows}
    </table>`;
}

function renderOrderTotals(data: StoreOrderConfirmedTemplateData): string {
  const shippingLine =
    data.shippingCents > 0
      ? `<tr>
          <td style="padding:6px 0;font-size:14px;color:${EMAIL_COLORS.muted};">Frete${data.shippingLabel ? ` (${escapeHtml(data.shippingLabel)})` : ''}</td>
          <td style="padding:6px 0;font-size:14px;color:${EMAIL_COLORS.text};text-align:right;">${formatCurrencyBrl(data.shippingCents)}</td>
        </tr>`
      : `<tr>
          <td style="padding:6px 0;font-size:14px;color:${EMAIL_COLORS.muted};">Frete</td>
          <td style="padding:6px 0;font-size:14px;color:${EMAIL_COLORS.text};text-align:right;">Grátis</td>
        </tr>`;

  const couponLine =
    data.couponDiscountCents && data.couponDiscountCents > 0
      ? `<tr>
          <td style="padding:6px 0;font-size:14px;color:${EMAIL_COLORS.muted};">Cupom${data.couponCode ? ` (${escapeHtml(data.couponCode)})` : ''}</td>
          <td style="padding:6px 0;font-size:14px;color:#86efac;text-align:right;">-${formatCurrencyBrl(data.couponDiscountCents)}</td>
        </tr>`
      : '';

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px;">
      <tr>
        <td style="padding:6px 0;font-size:14px;color:${EMAIL_COLORS.muted};">Subtotal</td>
        <td style="padding:6px 0;font-size:14px;color:${EMAIL_COLORS.text};text-align:right;">${formatCurrencyBrl(data.subtotalCents)}</td>
      </tr>
      ${couponLine}
      ${shippingLine}
      <tr>
        <td style="padding:12px 0 0;font-size:15px;font-weight:700;color:#fff;border-top:1px solid ${EMAIL_COLORS.border};">Total</td>
        <td style="padding:12px 0 0;font-size:18px;font-weight:700;color:${EMAIL_COLORS.ember};text-align:right;border-top:1px solid ${EMAIL_COLORS.border};">${formatCurrencyBrl(data.amountCents)}</td>
      </tr>
    </table>`;
}

export function storeOrderConfirmedHtml(
  data: StoreOrderConfirmedTemplateData
): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();
  const orderRef = data.orderId.slice(0, 8).toUpperCase();

  const shippingNote = data.bundledWithSubscription
    ? 'Seus itens serão enviados junto com a próxima caixa da assinatura.'
    : 'Após a produção, enviaremos para o endereço informado no checkout.';

  return buildEmailHtml({
    subject: STORE_ORDER_CONFIRMED_SUBJECT,
    preheader: `Pedido ${orderRef} confirmado com ${data.items.length} item(ns). Total ${formatCurrencyBrl(data.amountCents)}.`,
    eyebrow: 'Loja',
    headline: 'Pedido confirmado.',
    headlineAccent: 'confirmado',
    paragraphs: [
      `${name}, recebemos o pagamento do seu pedido na loja DungeonBox. Confira abaixo o que você comprou.`,
      shippingNote,
      `${STORE_PRODUCTION_LEAD_TIME_LABEL}.`,
    ],
    bodyHtml: `${renderOrderItemsTable(data.items)}${renderOrderTotals(data)}`,
    bullets: [
      'Acompanhe o status em Pagamentos no seu painel',
      'Você receberá outro e-mail quando o pedido for despachado',
    ],
    cta: { label: 'Ver meus pedidos', href: `${siteUrl}/dashboard/payments` },
    secondaryCta: { label: 'Continuar comprando', href: `${siteUrl}/loja` },
    callout: {
      title: 'Número do pedido',
      body: orderRef,
    },
  });
}

export function storeOrderConfirmedText(
  data: StoreOrderConfirmedTemplateData
): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();
  const orderRef = data.orderId.slice(0, 8).toUpperCase();

  const items = data.items
    .map((item) => {
      const variation = item.variationSummary ? ` (${item.variationSummary})` : '';
      return `- ${item.quantity}x ${item.name}${variation} — ${formatCurrencyBrl(item.unitPriceCents)} cada = ${formatCurrencyBrl(item.lineTotalCents)}`;
    })
    .join('\n');

  const shippingText =
    data.shippingCents > 0
      ? `Frete: ${formatCurrencyBrl(data.shippingCents)}${data.shippingLabel ? ` (${data.shippingLabel})` : ''}`
      : 'Frete: Grátis';

  const couponText =
    data.couponDiscountCents && data.couponDiscountCents > 0
      ? `Cupom${data.couponCode ? ` ${data.couponCode}` : ''}: -${formatCurrencyBrl(data.couponDiscountCents)}`
      : null;

  return buildEmailText([
    `${name}, seu pedido na loja DungeonBox foi confirmado.`,
    `Pedido: ${orderRef}`,
    'Itens:',
    items,
    `Subtotal: ${formatCurrencyBrl(data.subtotalCents)}`,
    ...(couponText ? [couponText] : []),
    shippingText,
    `Total: ${formatCurrencyBrl(data.amountCents)}`,
    STORE_PRODUCTION_LEAD_TIME_LABEL + '.',
    data.bundledWithSubscription
      ? 'Envio junto com a próxima caixa da assinatura.'
      : 'Envio avulso após a produção.',
    `Pagamentos: ${siteUrl}/dashboard/payments`,
    `Loja: ${siteUrl}/loja`,
  ]);
}
