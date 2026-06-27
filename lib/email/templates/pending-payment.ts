import {
  buildEmailHtml,
  buildEmailText,
  formatCurrencyBrl,
  greetingName,
} from '@/lib/email/layout';

export const PENDING_PAYMENT_SUBJECT =
  'Finalize seu pagamento — DungeonBox';

export interface PendingPaymentTemplateData {
  name?: string | null;
  planName?: string | null;
  amountCents: number;
  paymentUrl: string;
  dueDate?: string | null;
}

export function pendingPaymentHtml(data: PendingPaymentTemplateData): string {
  const name = greetingName(data.name);
  const amount = formatCurrencyBrl(data.amountCents);
  const planLine = data.planName
    ? ` do plano <strong style="color:#fff;">${data.planName}</strong>`
    : '';

  return buildEmailHtml({
    subject: PENDING_PAYMENT_SUBJECT,
    preheader: `Pagamento pendente de ${amount}. Clique para concluir sua assinatura.`,
    eyebrow: 'Cobrança',
    headline: 'Seu pagamento está pendente.',
    headlineAccent: 'pendente',
    paragraphs: [
      `${name}, identificamos um pagamento pendente${planLine} no valor de <strong style="color:#fff;">${amount}</strong>.`,
      data.dueDate
        ? `Vencimento: <strong style="color:#fff;">${data.dueDate}</strong>.`
        : 'Conclua o pagamento para ativar sua assinatura e liberar a produção da sua caixa.',
      'Use o botão abaixo para pagar com cartão, PIX ou boleto — conforme disponível no checkout.',
    ],
    cta: { label: 'Pagar agora', href: data.paymentUrl },
    callout: {
      title: 'Precisa de ajuda?',
      body: 'Responda este e-mail se tiver dificuldade com o pagamento. Nossa equipe pode reenviar o link ou orientar o checkout.',
    },
  });
}

export function pendingPaymentText(data: PendingPaymentTemplateData): string {
  const name = greetingName(data.name);
  const amount = formatCurrencyBrl(data.amountCents);
  const planLine = data.planName ? ` — plano ${data.planName}` : '';

  return buildEmailText([
    `${name}, você tem um pagamento pendente${planLine} de ${amount}.`,
    data.dueDate ? `Vencimento: ${data.dueDate}.` : '',
    `Link para pagar: ${data.paymentUrl}`,
  ]);
}
