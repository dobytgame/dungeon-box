import { COMPANY } from '@/lib/legal/constants';
import { getSiteUrl } from '@/lib/email/config';
import {
  buildEmailHtml,
  buildEmailText,
  greetingName,
} from '@/lib/email/layout';

export const SUBSCRIPTION_CANCELLED_SUBJECT =
  'Assinatura encerrada — até a próxima aventura';

export interface SubscriptionCancelledTemplateData {
  name?: string | null;
  planName: string;
  effectiveUntil?: string | null;
  hasPendingShipment?: boolean;
}

export function subscriptionCancelledHtml(
  data: SubscriptionCancelledTemplateData,
): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();
  const until = data.effectiveUntil
    ? `Seu acesso e benefícios permanecem até <strong style="color:#fff;">${data.effectiveUntil}</strong>.`
    : 'Não haverá novas cobranças a partir de agora.';

  const pendingNote = data.hasPendingShipment
    ? 'Se já existe um kit em preparação ou a caminho, ele segue o fluxo normal de envio — você receberá o rastreio por e-mail.'
    : 'Nenhum novo ciclo será cobrado ou enviado após o encerramento.';

  return buildEmailHtml({
    subject: SUBSCRIPTION_CANCELLED_SUBJECT,
    preheader: `Plano ${data.planName} cancelado. Sem novas cobranças.`,
    eyebrow: 'Tesouro',
    headline: 'Até a próxima aventura.',
    headlineAccent: 'aventura',
    paragraphs: [
      `${name}, confirmamos o cancelamento da sua assinatura <strong style="color:#fff;">${data.planName}</strong>.`,
      until,
      pendingNote,
      'Sentiremos sua falta na Guilda. Se mudar de ideia, é só reativar quando quiser.',
    ],
    cta: { label: 'Ver planos', href: `${siteUrl}/#planos` },
    secondaryCta: {
      label: 'Falar com o Mestre',
      href: `mailto:${COMPANY.supportEmail}`,
    },
    callout: {
      title: 'Dúvidas sobre cobrança?',
      body: 'Responda este e-mail ou escreva para o Tesouro — analisamos faturas e estornos caso a caso.',
    },
  });
}

export function subscriptionCancelledText(
  data: SubscriptionCancelledTemplateData,
): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();

  return buildEmailText([
    `${name}, assinatura ${data.planName} cancelada.`,
    data.effectiveUntil ? `Válida até: ${data.effectiveUntil}` : 'Sem novas cobranças.',
    data.hasPendingShipment
      ? 'Kits já em trânsito seguem normalmente.'
      : '',
    `Reativar: ${siteUrl}/#planos`,
  ].filter(Boolean));
}
