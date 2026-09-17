import {
  buildEmailHtml,
  buildEmailText,
  formatCurrencyBrl,
  greetingName,
} from '@/lib/email/layout';

export const CUSTOM_STORE_ORDER_SUBJECT =
  'Seu pedido personalizado está pronto para pagamento — DungeonBox';

export interface CustomStoreOrderEmailItem {
  name: string;
  quantity: number;
  lineTotalCents: number;
}

export interface CustomStoreOrderEmailData {
  name?: string | null;
  amountCents: number;
  paymentUrl: string;
  items: CustomStoreOrderEmailItem[];
  notes?: string | null;
}

export function customStoreOrderHtml(data: CustomStoreOrderEmailData): string {
  const name = greetingName(data.name);
  const amount = formatCurrencyBrl(data.amountCents);
  const itemLines = data.items.map((item) => {
    const qty = item.quantity > 1 ? `${item.quantity}× ` : '';
    return `${qty}${item.name} — ${formatCurrencyBrl(item.lineTotalCents)}`;
  });

  return buildEmailHtml({
    subject: CUSTOM_STORE_ORDER_SUBJECT,
    preheader: `Pedido personalizado de ${amount}. Abra o link para pagar com PIX ou cartão.`,
    eyebrow: 'Loja',
    headline: 'Seu pedido personalizado está pronto.',
    headlineAccent: 'pronto',
    paragraphs: [
      `${name}, montamos um pedido sob medida no valor de <strong style="color:#fff;">${amount}</strong>.`,
      'Abra o link abaixo para ver os itens e pagar com PIX ou cartão. O envio usa o endereço cadastrado na sua conta.',
    ],
    bullets: itemLines,
    cta: { label: 'Pagar agora', href: data.paymentUrl },
    callout: data.notes?.trim()
      ? {
          title: 'Observação',
          body: data.notes.trim(),
        }
      : {
          title: 'Dúvidas?',
          body: 'Responda este e-mail se precisar ajustar itens, valor ou endereço antes de pagar.',
        },
  });
}

export function customStoreOrderText(data: CustomStoreOrderEmailData): string {
  const name = greetingName(data.name);
  const amount = formatCurrencyBrl(data.amountCents);
  const items = data.items
    .map((item) => {
      const qty = item.quantity > 1 ? `${item.quantity}× ` : '';
      return `- ${qty}${item.name}: ${formatCurrencyBrl(item.lineTotalCents)}`;
    })
    .join('\n');

  return buildEmailText([
    `${name}, seu pedido personalizado de ${amount} está pronto para pagamento.`,
    items,
    data.notes?.trim() ? `Observação: ${data.notes.trim()}` : '',
    `Pagar agora: ${data.paymentUrl}`,
  ]);
}
