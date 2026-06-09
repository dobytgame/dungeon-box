import { COMPANY } from '@/lib/legal/constants';
import { getRoleEmailAddress, getSiteUrl } from '@/lib/email/config';
import {
  buildEmailHtml,
  buildEmailText,
  greetingName,
} from '@/lib/email/layout';

export const SUPPORT_CONFIRMATION_SUBJECT =
  'Recebemos sua mensagem — a Guilda responde em breve';

export interface SupportConfirmationTemplateData {
  name?: string | null;
  subject?: string | null;
  messagePreview?: string | null;
}

export function supportConfirmationHtml(
  data: SupportConfirmationTemplateData,
): string {
  const name = greetingName(data.name);
  const supportEmail =
    getRoleEmailAddress('support') ?? COMPANY.supportEmail;
  const ticketSubject = data.subject?.trim() || 'Contato pelo site';

  return buildEmailHtml({
    subject: SUPPORT_CONFIRMATION_SUBJECT,
    preheader: 'Nossa equipe costuma responder em até 1 dia útil.',
    eyebrow: 'Mestre',
    headline: 'Mensagem <span style="color:#ff6b2b;">recebida</span>.',
    paragraphs: [
      `${name}, sua mensagem chegou ao Mestre da DungeonBox.`,
      `Assunto: <strong style="color:#fff;">${ticketSubject}</strong>.`,
      'Respondemos em até <strong style="color:#fff;">1 dia útil</strong> (geralmente bem antes). Enquanto isso, confira o FAQ — muitas dúvidas sobre entrega, planos e peças já estão lá.',
    ],
    bullets: [
      'Horário: segunda a sexta, horário comercial (Brasil)',
      'Para urgências de entrega, inclua o número do ciclo e o rastreio',
      `Respostas virão de ${supportEmail}`,
    ],
    cta: { label: 'Ver perguntas frequentes', href: `${getSiteUrl()}/#faq` },
    callout: data.messagePreview
      ? {
          title: 'Resumo do que você enviou',
          body: data.messagePreview,
        }
      : {
          title: 'Precisa complementar?',
          body: `Responda este e-mail diretamente — sua conversa fica vinculada a ${supportEmail}.`,
        },
  });
}

export function supportConfirmationText(
  data: SupportConfirmationTemplateData,
): string {
  const name = greetingName(data.name);
  const supportEmail =
    getRoleEmailAddress('support') ?? COMPANY.supportEmail;
  const ticketSubject = data.subject?.trim() || 'Contato pelo site';

  return buildEmailText([
    `${name}, recebemos sua mensagem.`,
    `Assunto: ${ticketSubject}`,
    data.messagePreview ? `Mensagem: ${data.messagePreview}` : '',
    `Respondemos em até 1 dia útil via ${supportEmail}.`,
    `FAQ: ${getSiteUrl()}/#faq`,
  ].filter(Boolean));
}
