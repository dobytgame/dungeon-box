import { buildMarketingCampaignUrl } from '@/lib/email/marketing-links';
import {
  buildEmailHtml,
  buildEmailText,
  greetingName,
} from '@/lib/email/layout';

export const VOLTEI10_CAMPAIGN = 'voltei10_winback';
export const VOLTEI10_PROMO_CODE = 'VOLTEI10';

export const VOLTEI10_SUBJECT =
  'Você criou sua conta. Falta só um passo. 🎲';

export interface Voltei10WinbackTemplateData {
  name?: string | null;
}

function campaignUrl(path: string, content: string): string {
  return buildMarketingCampaignUrl(path, {
    campaign: VOLTEI10_CAMPAIGN,
    content,
  });
}

export function voltei10WinbackHtml(data: Voltei10WinbackTemplateData): string {
  const name = greetingName(data.name);
  const plansUrl = campaignUrl('/#planos', 'cta_assinar');
  const siteUrl = campaignUrl('/', 'footer');

  return buildEmailHtml({
    subject: VOLTEI10_SUBJECT,
    preheader:
      '10% OFF no primeiro mês com VOLTEI10. Escolha seu plano e receba cenários 3D modulares todo mês.',
    eyebrow: 'Guilda DungeonBox',
    headline: 'Falta só um passo.',
    headlineAccent: 'passo',
    paragraphs: [
      `Oi ${name},`,
      'Você se cadastrou na DungeonBox mas ainda não escolheu seu plano.',
      'A gente ficou curioso — ficou alguma dúvida? O preço pesou? Não era o momento certo?',
      'Seja qual for o motivo, preparamos algo especial pra te ajudar a dar esse passo:',
      `É só escolher seu plano em <a href="${plansUrl}" style="color:#00d4ff;text-decoration:underline;">dungeonbox.com.br</a> e usar o código no checkout.`,
      'Todo mês um kit com cenários 3D modulares chega na sua porta. Sistema OpenLOCK — cada peça encaixa na anterior para sempre. Cancele quando quiser, sem carência.',
    ],
    bullets: [
      '⚔️ Plano Aventureiro — R$ 80/mês (de R$ 89)',
      '⚔️ Plano Herói — R$ 125/mês (de R$ 139)',
      '⚔️ Plano Lendário — R$ 179/mês (de R$ 199)',
    ],
    cta: {
      label: 'Assinar e garantir meu kit',
      href: plansUrl,
    },
    callout: {
      title: `🎲 10% OFF no primeiro mês`,
      body: `Use o cupom <strong>${VOLTEI10_PROMO_CODE}</strong> no checkout. Válido por 7 dias.`,
    },
    signature: {
      name: 'Alessandro',
      subtitle: 'DungeonBox',
      href: siteUrl,
      hrefLabel: 'dungeonbox.com.br',
    },
    footerNote:
      'Você recebeu este e-mail por ter criado conta na DungeonBox. Para parar de receber comunicados, responda pedindo descadastro.',
  });
}

export function voltei10WinbackText(data: Voltei10WinbackTemplateData): string {
  const name = greetingName(data.name);
  const plansUrl = campaignUrl('/#planos', 'cta_assinar');
  const siteUrl = campaignUrl('/', 'footer');

  return buildEmailText([
    `Oi ${name},`,
    'Você se cadastrou na DungeonBox mas ainda não escolheu seu plano.',
    'A gente ficou curioso — ficou alguma dúvida? O preço pesou? Não era o momento certo?',
    'Seja qual for o motivo, preparamos algo especial pra te ajudar a dar esse passo:',
    `🎲 10% OFF no primeiro mês com o código: ${VOLTEI10_PROMO_CODE}`,
    `É só escolher seu plano em ${plansUrl} e usar o código no checkout.`,
    '⚔️ Plano Aventureiro — R$ 80/mês (de R$ 89)',
    '⚔️ Plano Herói — R$ 125/mês (de R$ 139)',
    '⚔️ Plano Lendário — R$ 179/mês (de R$ 199)',
    'Todo mês um kit com cenários 3D modulares chega na sua porta. Sistema OpenLOCK — cada peça encaixa na anterior para sempre. Cancele quando quiser, sem carência.',
    `O código ${VOLTEI10_PROMO_CODE} é válido por 7 dias.`,
    `Assinar: ${plansUrl}`,
    'Qualquer dúvida é só responder este e-mail — eu mesmo leio tudo.',
    'Alessandro — DungeonBox',
    siteUrl,
  ]);
}
