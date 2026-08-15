import {
  buildEmailHtml,
  buildEmailText,
  formatCurrencyBrl,
  greetingName,
} from '@/lib/email/layout';

export const SUBSCRIPTION_PIX_PAYMENT_SUBJECT =
  'Pague com PIX e ative seu plano — DungeonBox';

export const SUBSCRIPTION_PIX_RENEWAL_SUBJECT =
  'PIX da renovação do mês — DungeonBox';

export interface SubscriptionPixPaymentTemplateData {
  name?: string | null;
  planName?: string | null;
  amountCents: number;
  paymentUrl: string;
  pixPayload: string;
  expirationDate?: string | null;
  purpose?: 'activation' | 'renewal';
  periodLabel?: string | null;
}

function formatExpiration(raw?: string | null): string | null {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function isRenewal(data: SubscriptionPixPaymentTemplateData): boolean {
  return data.purpose === 'renewal';
}

export function subscriptionPixPaymentSubject(
  data: SubscriptionPixPaymentTemplateData
): string {
  return isRenewal(data)
    ? SUBSCRIPTION_PIX_RENEWAL_SUBJECT
    : SUBSCRIPTION_PIX_PAYMENT_SUBJECT;
}

export function subscriptionPixPaymentHtml(
  data: SubscriptionPixPaymentTemplateData
): string {
  const name = greetingName(data.name);
  const amount = formatCurrencyBrl(data.amountCents);
  const planLine = data.planName
    ? ` do plano <strong style="color:#fff;">${data.planName}</strong>`
    : '';
  const expiration = formatExpiration(data.expirationDate);
  const renewal = isRenewal(data);
  const periodLine = data.periodLabel
    ? ` referente a <strong style="color:#fff;">${data.periodLabel}</strong>`
    : '';

  return buildEmailHtml({
    subject: subscriptionPixPaymentSubject(data),
    preheader: renewal
      ? `PIX de ${amount} da renovação da sua DungeonBox.`
      : `PIX de ${amount} para ativar sua assinatura DungeonBox.`,
    eyebrow: renewal ? 'Renovação PIX' : 'Pagamento PIX',
    headline: renewal
      ? 'Sua renovação está pronta para pagar.'
      : 'Seu plano está quase ativo.',
    headlineAccent: 'PIX',
    paragraphs: [
      renewal
        ? `${name}, geramos o PIX da renovação${planLine}${periodLine} no valor de <strong style="color:#fff;">${amount}</strong>.`
        : `${name}, geramos um pagamento PIX${planLine} no valor de <strong style="color:#fff;">${amount}</strong>.`,
      expiration
        ? `O código expira em <strong style="color:#fff;">${expiration}</strong>.`
        : renewal
          ? 'Conclua o pagamento para manter a produção da próxima caixa.'
          : 'Conclua o pagamento para liberar a produção da sua caixa.',
      'Copie o código PIX abaixo no app do seu banco ou use o botão para abrir a página de pagamento.',
    ],
    cta: { label: 'Abrir pagamento', href: data.paymentUrl },
    callout: {
      title: 'Código PIX copia e cola',
      body: `<code style="display:block;word-break:break-all;font-size:12px;line-height:1.5;color:#e4e4e7;">${data.pixPayload}</code>`,
    },
  });
}

export function subscriptionPixPaymentText(
  data: SubscriptionPixPaymentTemplateData
): string {
  const name = greetingName(data.name);
  const amount = formatCurrencyBrl(data.amountCents);
  const planLine = data.planName ? ` — plano ${data.planName}` : '';
  const expiration = formatExpiration(data.expirationDate);
  const periodLine = data.periodLabel ? ` (${data.periodLabel})` : '';

  return buildEmailText([
    isRenewal(data)
      ? `${name}, o PIX da renovação${planLine}${periodLine} de ${amount} está disponível.`
      : `${name}, seu pagamento PIX${planLine} de ${amount} está disponível.`,
    expiration ? `Expira em: ${expiration}.` : '',
    `Código PIX: ${data.pixPayload}`,
    `Link: ${data.paymentUrl}`,
  ]);
}
