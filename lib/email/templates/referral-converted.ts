import { getSiteUrl } from '@/lib/email/config';
import {
  buildEmailHtml,
  buildEmailText,
  greetingName,
} from '@/lib/email/layout';
import { REFERRAL_QUALIFICATION_DAYS } from '@/lib/referral/constants';

export const REFERRAL_CONVERTED_SUBJECT =
  'Parabéns! Alguém entrou na guilda pela sua indicação';

export interface ReferralConvertedTemplateData {
  name?: string | null;
  referredName: string;
  projectedPoints: number;
  qualificationDays?: number;
}

export function referralConvertedHtml(
  data: ReferralConvertedTemplateData
): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();
  const days = data.qualificationDays ?? REFERRAL_QUALIFICATION_DAYS;

  return buildEmailHtml({
    subject: REFERRAL_CONVERTED_SUBJECT,
    preheader: `${data.referredName} assinou a DungeonBox pelo seu link. Até ${data.projectedPoints} pontos a caminho.`,
    eyebrow: 'Indique e Ganhe',
    headline: 'Sua indicação virou assinante!',
    headlineAccent: 'assinante',
    paragraphs: [
      `${name}, <strong style="color:#fff;">${data.referredName}</strong> acaba de assinar a DungeonBox usando o seu link de indicação.`,
      `Quando ${data.referredName.split(' ')[0] ?? 'o indicado'} permanecer ativo por <strong style="color:#fff;">${days} dias</strong>, você recebe até <strong style="color:#fff;">${data.projectedPoints} pontos</strong> para trocar por recompensas na loja.`,
      'Acompanhe o status no placar da sua área logada — cada conversão te aproxima do próximo rank de emissário.',
    ],
    bullets: [
      'Indicação registrada e em contagem',
      `Pontos liberados após ${days} dias de assinatura ativa`,
      'Resgate kits, tintas e produtos exclusivos',
    ],
    cta: { label: 'Ver meu placar', href: `${siteUrl}/dashboard/indique/placar` },
    secondaryCta: { label: 'Compartilhar link', href: `${siteUrl}/dashboard/indique` },
    callout: {
      title: 'Continue convocando',
      body: 'Quanto mais mestres você trouxer, mais pontos acumula — e sobe de rank no placar da guilda.',
    },
  });
}

export function referralConvertedText(
  data: ReferralConvertedTemplateData
): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();
  const days = data.qualificationDays ?? REFERRAL_QUALIFICATION_DAYS;

  return buildEmailText([
    `${name}, ${data.referredName} assinou pela sua indicação!`,
    `Até ${data.projectedPoints} pontos após ${days} dias ativos.`,
    `Placar: ${siteUrl}/dashboard/indique/placar`,
    `Seu link: ${siteUrl}/dashboard/indique`,
  ]);
}
