import { getSiteUrl } from '@/lib/email/config';
import {
  buildEmailHtml,
  buildEmailText,
  escapeHtml,
} from '@/lib/email/layout';
import { buildUnsubscribeUrl } from '@/lib/email/unsubscribe';

export interface MarketingBroadcastTemplateData {
  subject: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  recipientEmail?: string;
}

function resolveCtaHref(href?: string): string | undefined {
  if (!href?.trim()) return undefined;
  const trimmed = href.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const siteUrl = getSiteUrl().replace(/\/$/, '');
  return trimmed.startsWith('/') ? `${siteUrl}${trimmed}` : `${siteUrl}/${trimmed}`;
}

function bodyToParagraphs(body: string): string[] {
  return body
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => escapeHtml(block).replace(/\n/g, '<br>'));
}

function unsubscribeFooter(email?: string): string {
  if (!email) {
    return 'Você recebeu este e-mail por fazer parte da comunidade DungeonBox. Para parar de receber comunicados, responda pedindo descadastro.';
  }
  const unsubscribeUrl = buildUnsubscribeUrl(email);
  return `Você recebeu este e-mail por fazer parte da comunidade DungeonBox. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#78716c;text-decoration:underline;">Descadastrar</a>.`;
}

export function marketingBroadcastHtml(
  data: MarketingBroadcastTemplateData
): string {
  const paragraphs = bodyToParagraphs(data.body);
  const ctaHref = resolveCtaHref(data.ctaHref);
  const preheaderSource = paragraphs[0]?.replace(/<br>/g, ' ') ?? data.title;

  return buildEmailHtml({
    subject: data.subject,
    preheader: preheaderSource.slice(0, 140),
    eyebrow: 'Crônica da Taverna',
    headline: data.title,
    paragraphs: paragraphs.length
      ? paragraphs
      : [escapeHtml('Novidades da Guilda DungeonBox.')],
    cta:
      data.ctaLabel && ctaHref
        ? { label: data.ctaLabel, href: ctaHref }
        : undefined,
    footerNote: unsubscribeFooter(data.recipientEmail),
  });
}

export function marketingBroadcastText(
  data: MarketingBroadcastTemplateData
): string {
  const ctaHref = resolveCtaHref(data.ctaHref);
  const blocks = [data.title, data.body];
  if (data.ctaLabel && ctaHref) {
    blocks.push(`${data.ctaLabel}: ${ctaHref}`);
  }
  if (data.recipientEmail) {
    blocks.push(`Descadastrar: ${buildUnsubscribeUrl(data.recipientEmail)}`);
  }
  return buildEmailText(blocks);
}
