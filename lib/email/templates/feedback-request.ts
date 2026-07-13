import { getSiteUrl } from '@/lib/email/config';
import {
  buildEmailHtml,
  buildEmailText,
  greetingName,
} from '@/lib/email/layout';

export const FEEDBACK_REQUEST_SUBJECT =
  'Como foi sua dungeon? Conte pra gente · DungeonBox';

export interface FeedbackRequestTemplateData {
  name?: string | null;
  cycleNumber: number;
  themeName?: string | null;
  cycleId: string;
}

function cycleLabel(data: FeedbackRequestTemplateData): string {
  const theme = data.themeName ? ` · ${data.themeName}` : '';
  return `ciclo ${data.cycleNumber}${theme}`;
}

function feedbackUrl(cycleId: string): string {
  return `${getSiteUrl()}/dashboard/feedback?cycle=${cycleId}`;
}

export function feedbackRequestHtml(data: FeedbackRequestTemplateData): string {
  const name = greetingName(data.name);
  const label = cycleLabel(data);
  const url = feedbackUrl(data.cycleId);

  return buildEmailHtml({
    subject: FEEDBACK_REQUEST_SUBJECT,
    preheader: `Avalie o ${label} com estrelas e fotos`,
    eyebrow: 'Sua opinião',
    headline: 'Montou a mesa?',
    headlineAccent: 'mesa',
    paragraphs: [
      `${name}, esperamos que o <strong style="color:#fff;">${label}</strong> tenha chegado com tudo certinho.`,
      'Sua avaliação nos ajuda a melhorar cada caixa — e inspira outros mestres na guilda.',
      'Leva menos de um minuto: escolha de 1 a 5 estrelas, deixe um comentário e, se quiser, envie fotos da mesa ou das miniaturas pintadas.',
    ],
    bullets: [
      'Nota com estrelas de 1 a 5',
      'Comentário opcional sobre a experiência',
      'Fotos da mesa ou das peças (opcional)',
    ],
    cta: { label: 'Avaliar minha caixa', href: url },
    secondaryCta: { label: 'Ver entregas', href: `${getSiteUrl()}/dashboard/deliveries` },
    callout: {
      title: 'Por que avaliar?',
      body: 'Cada feedback guia temas, qualidade de impressão e o que colocamos na próxima forja.',
    },
  });
}

export function feedbackRequestText(data: FeedbackRequestTemplateData): string {
  const name = greetingName(data.name);
  const label = cycleLabel(data);
  const url = feedbackUrl(data.cycleId);

  return buildEmailText([
    `${name}, como foi o ${label}?`,
    'Avalie com estrelas e, se quiser, envie fotos da sua mesa.',
    `Avaliar: ${url}`,
    `Entregas: ${getSiteUrl()}/dashboard/deliveries`,
  ]);
}
