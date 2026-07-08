import { getSiteUrl } from '@/lib/email/config';
import {
  buildEmailHtml,
  buildEmailText,
  formatDateBr,
  greetingName,
} from '@/lib/email/layout';

export const PLAN_UPGRADE_APPLIED_SUBJECT =
  'Plano atualizado — seu upgrade está ativo';

export interface PlanUpgradeAppliedTemplateData {
  name?: string | null;
  previousPlanName: string;
  newPlanName: string;
  nextBillingDate?: string | null;
}

export function planUpgradeAppliedHtml(
  data: PlanUpgradeAppliedTemplateData
): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();
  const nextBilling = formatDateBr(data.nextBillingDate);

  return buildEmailHtml({
    subject: PLAN_UPGRADE_APPLIED_SUBJECT,
    preheader: `Agora você está no plano ${data.newPlanName}. Próxima cobrança em ${nextBilling}.`,
    eyebrow: 'Tesouro',
    headline: 'Upgrade confirmado.',
    headlineAccent: 'confirmado',
    paragraphs: [
      `${name}, seu upgrade de <strong style="color:#fff;">${data.previousPlanName}</strong> para <strong style="color:#fff;">${data.newPlanName}</strong> foi efetivado neste ciclo.`,
      `A partir de agora você recebe os benefícios do plano <strong style="color:#fff;">${data.newPlanName}</strong>. A próxima cobrança está prevista para <strong style="color:#fff;">${nextBilling}</strong>.`,
      'Você pode acompanhar assinatura, entregas e cobranças pelo painel a qualquer momento.',
    ],
    cta: {
      label: 'Ver minha assinatura',
      href: `${siteUrl}/dashboard/subscription`,
    },
    secondaryCta: {
      label: 'Acompanhar entregas',
      href: `${siteUrl}/dashboard/deliveries`,
    },
    callout: {
      title: 'Valor da assinatura',
      body: 'O valor recorrente já reflete o novo plano (incluindo cupom e add-ons, se houver). Dúvidas sobre cobrança? Responda este e-mail.',
    },
  });
}

export function planUpgradeAppliedText(
  data: PlanUpgradeAppliedTemplateData
): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();
  const nextBilling = formatDateBr(data.nextBillingDate);

  return buildEmailText([
    `${name}, upgrade confirmado: ${data.previousPlanName} → ${data.newPlanName}.`,
    `Próxima cobrança: ${nextBilling}.`,
    `Assinatura: ${siteUrl}/dashboard/subscription`,
    `Entregas: ${siteUrl}/dashboard/deliveries`,
  ]);
}
