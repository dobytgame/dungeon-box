import { getSiteUrl } from '@/lib/email/config';
import {
  buildEmailHtml,
  buildEmailText,
  formatCurrencyBrl,
  greetingName,
} from '@/lib/email/layout';

export const PURCHASE_COMPLETED_SUBJECT =
  'Assinatura confirmada — sua primeira dungeon está a caminho';

export interface PurchaseCompletedTemplateData {
  name?: string | null;
  planName: string;
  amountCents: number;
  cycleNumber?: number;
}

export function purchaseCompletedHtml(data: PurchaseCompletedTemplateData): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();
  const amount = formatCurrencyBrl(data.amountCents);
  const cycle = data.cycleNumber ?? 1;

  return buildEmailHtml({
    subject: PURCHASE_COMPLETED_SUBJECT,
    preheader: `Plano ${data.planName} ativo. Ciclo ${cycle} em preparação na forja.`,
    eyebrow: 'Guilda',
    headline: 'Pagamento confirmado.',
    headlineAccent: 'confirmado',
    paragraphs: [
      `${name}, sua assinatura <strong style="color:#fff;">${data.planName}</strong> está ativa.`,
      `Valor deste ciclo: <strong style="color:#fff;">${amount}</strong>. Já estamos preparando o kit do ciclo ${cycle} — peças impressas, curadas e embaladas para sua mesa.`,
      'Você acompanha tudo pelo painel: status da produção, envio e rastreio.',
    ],
    bullets: [
      'Produção do kit mensal na Forja DungeonBox',
      'Aviso por e-mail quando o pedido for despachado',
      'Rastreio disponível no painel e por e-mail',
    ],
    cta: { label: 'Ver minha assinatura', href: `${siteUrl}/dashboard` },
    secondaryCta: { label: 'Acompanhar entregas', href: `${siteUrl}/dashboard/deliveries` },
    callout: {
      title: 'Próxima cobrança',
      body: 'A renovação é automática todo mês. Você pode gerenciar ou cancelar quando quiser pelo painel.',
    },
  });
}

export function purchaseCompletedText(data: PurchaseCompletedTemplateData): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();
  const amount = formatCurrencyBrl(data.amountCents);
  const cycle = data.cycleNumber ?? 1;

  return buildEmailText([
    `${name}, assinatura ${data.planName} confirmada.`,
    `Valor: ${amount}. Ciclo ${cycle} em preparação.`,
    `Painel: ${siteUrl}/dashboard`,
    `Entregas: ${siteUrl}/dashboard/deliveries`,
  ]);
}
