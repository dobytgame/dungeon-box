import { getSiteUrl } from '@/lib/email/config';
import {
  buildEmailHtml,
  buildEmailText,
  greetingName,
} from '@/lib/email/layout';

export const ORDER_SHIPPED_SUBJECT = 'Seu kit saiu da forja — rastreio disponível';

export interface OrderShippedTemplateData {
  name?: string | null;
  cycleNumber: number;
  themeName?: string | null;
  trackingCode: string;
  carrier?: string | null;
  estimatedDelivery?: string | null;
}

export function orderShippedHtml(data: OrderShippedTemplateData): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();
  const theme = data.themeName ? ` · ${data.themeName}` : '';
  const carrier = data.carrier?.trim() || 'Transportadora';
  const eta = data.estimatedDelivery
    ? `Previsão de entrega: <strong style="color:#fff;">${data.estimatedDelivery}</strong>.`
    : 'A previsão de entrega aparece no rastreio assim que a transportadora atualizar.';

  return buildEmailHtml({
    subject: ORDER_SHIPPED_SUBJECT,
    preheader: `Ciclo ${data.cycleNumber} a caminho. Código: ${data.trackingCode}`,
    eyebrow: 'Rastreio',
    headline: 'Saiu da forja.',
    headlineAccent: 'forja',
    paragraphs: [
      `${name}, o kit do <strong style="color:#fff;">ciclo ${data.cycleNumber}</strong>${theme} foi despachado.`,
      `Transportadora: <strong style="color:#fff;">${carrier}</strong>.`,
      `Código de rastreio: <strong style="color:#00d4ff;">${data.trackingCode}</strong>.`,
      eta,
    ],
    cta: { label: 'Ver no painel', href: `${siteUrl}/dashboard/deliveries` },
    callout: {
      title: 'Ao receber',
      body: 'Confira as peças na embalagem. Qualquer problema, responda este e-mail em até 7 dias.',
    },
    footerNote: 'Guarde a embalagem até conferir todas as peças do ciclo.',
  });
}

export function orderShippedText(data: OrderShippedTemplateData): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();
  const theme = data.themeName ? ` (${data.themeName})` : '';
  const carrier = data.carrier?.trim() || 'Transportadora';

  return buildEmailText([
    `${name}, ciclo ${data.cycleNumber}${theme} despachado.`,
    `${carrier} · Rastreio: ${data.trackingCode}`,
    data.estimatedDelivery ? `Previsão: ${data.estimatedDelivery}` : '',
    `Painel: ${siteUrl}/dashboard/deliveries`,
  ].filter(Boolean));
}
