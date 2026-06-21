import { getSiteUrl } from '@/lib/email/config';
import {
  buildEmailHtml,
  buildEmailText,
  greetingName,
} from '@/lib/email/layout';

export const REFERRAL_POINTS_EARNED_SUBJECT =
  'Pontos creditados — sua indicação foi confirmada!';

export interface ReferralPointsEarnedTemplateData {
  name?: string | null;
  referredName: string;
  pointsEarned: number;
  newBalance: number;
  rankName?: string | null;
}

export function referralPointsEarnedHtml(
  data: ReferralPointsEarnedTemplateData
): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();
  const rankLine = data.rankName
    ? ` Você agora é <strong style="color:#fff;">${data.rankName}</strong> no placar da guilda.`
    : '';

  return buildEmailHtml({
    subject: REFERRAL_POINTS_EARNED_SUBJECT,
    preheader: `+${data.pointsEarned} pontos creditados. Saldo: ${data.newBalance} pts.`,
    eyebrow: 'Indique e Ganhe',
    headline: 'Pontos creditados!',
    headlineAccent: 'creditados',
    paragraphs: [
      `${name}, a indicação de <strong style="color:#fff;">${data.referredName}</strong> completou 30 dias de assinatura ativa.`,
      `Foram creditados <strong style="color:#fff;">+${data.pointsEarned} pontos</strong> na sua conta. Seu saldo agora é <strong style="color:#fff;">${data.newBalance} pontos</strong>.${rankLine}`,
      'Escolha uma recompensa e receba junto ao seu próximo kit mensal.',
    ],
    bullets: [
      `${data.pointsEarned} pontos disponíveis para resgate`,
      'Kits, tintas e produtos da loja',
      'Validade de 12 meses por lote de pontos',
    ],
    cta: { label: 'Resgatar recompensa', href: `${siteUrl}/dashboard/indique` },
    secondaryCta: { label: 'Ver placar', href: `${siteUrl}/dashboard/indique/placar` },
    callout: {
      title: 'Continue indicando',
      body: 'A partir da 3ª indicação qualificada no mesmo mês, você ganha bônus de +20 pontos por conversão.',
    },
  });
}

export function referralPointsEarnedText(
  data: ReferralPointsEarnedTemplateData
): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();

  return buildEmailText([
    `${name}, +${data.pointsEarned} pontos creditados pela indicação de ${data.referredName}.`,
    `Saldo: ${data.newBalance} pts.`,
    data.rankName ? `Rank: ${data.rankName}.` : '',
    `Resgatar: ${siteUrl}/dashboard/indique`,
    `Placar: ${siteUrl}/dashboard/indique/placar`,
  ]);
}
