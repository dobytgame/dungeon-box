import { getSiteUrl } from '@/lib/email/config';
import { buildEmailHtml, buildEmailText, greetingName } from '@/lib/email/layout';

export const UGC_RECEIVED_SUBJECT = 'Aventura registrada — a Guilda vai analisar · DungeonBox';
export const UGC_APPROVED_SUBJECT = 'Sua mesa foi aprovada — brinde no próximo kit · DungeonBox';
export const UGC_REJECTED_SUBJECT = 'Sobre o conteúdo que você enviou · DungeonBox';

function aventuraUrl(): string {
  return `${getSiteUrl()}/dashboard/aventura`;
}

export function ugcReceivedHtml(name?: string | null): string {
  return buildEmailHtml({
    subject: UGC_RECEIVED_SUBJECT,
    preheader: 'Sua aventura entrou para os registros da Guilda',
    eyebrow: 'Mostre sua Aventura',
    headline: 'Aventura registrada',
    headlineAccent: 'registrada',
    paragraphs: [
      `${greetingName(name)}, recebemos as fotos e o contexto da sua mesa.`,
      'A equipe vai analisar o material. Se for aprovado, o brinde segue no próximo kit ainda não embalado.',
      'O envio não garante aprovação nem o brinde — mas a mesa já está nos registros.',
    ],
    cta: { label: 'Ver meus envios', href: aventuraUrl() },
  });
}

export function ugcReceivedText(name?: string | null): string {
  return buildEmailText([
    `${greetingName(name)}, recebemos sua aventura.`,
    'Vamos analisar o conteúdo. Se for aprovado, o brinde vai no próximo kit.',
    `Acompanhar: ${aventuraUrl()}`,
  ]);
}

export function ugcApprovedHtml(name?: string | null, cycleNumber?: number | null): string {
  const kit = cycleNumber
    ? `O brinde foi marcado no ciclo #${cycleNumber}.`
    : 'O brinde será incluído no próximo kit ainda não embalado, quando houver um ciclo aberto.';

  return buildEmailHtml({
    subject: UGC_APPROVED_SUBJECT,
    preheader: 'Conteúdo aprovado — brinde a caminho no próximo kit',
    eyebrow: 'Mostre sua Aventura',
    headline: 'Sua mesa foi aprovada',
    headlineAccent: 'aprovada',
    paragraphs: [
      `${greetingName(name)}, a equipe aprovou o conteúdo que você enviou.`,
      kit,
      'Sua mesa também pode aparecer nas redes da DungeonBox, conforme a autorização que você deu.',
    ],
    cta: { label: 'Ver a campanha', href: aventuraUrl() },
  });
}

export function ugcApprovedText(name?: string | null, cycleNumber?: number | null): string {
  return buildEmailText([
    `${greetingName(name)}, sua mesa foi aprovada.`,
    cycleNumber
      ? `Brinde marcado no ciclo #${cycleNumber}.`
      : 'O brinde entra no próximo kit aberto.',
    `Campanha: ${aventuraUrl()}`,
  ]);
}

export function ugcRejectedHtml(name?: string | null): string {
  return buildEmailHtml({
    subject: UGC_REJECTED_SUBJECT,
    preheader: 'Desta vez o envio não foi aprovado',
    eyebrow: 'Mostre sua Aventura',
    headline: 'Não rolou desta vez',
    paragraphs: [
      `${greetingName(name)}, analisamos o conteúdo e, desta vez, ele não foi aprovado para a campanha.`,
      'Pode ser iluminação, o kit pouco visível ou o material fora do que usamos nas redes. Você pode enviar de novo quando tiver outra sessão.',
      'O brinde vale só para conteúdos aprovados.',
    ],
    cta: { label: 'Enviar outra aventura', href: aventuraUrl() },
  });
}

export function ugcRejectedText(name?: string | null): string {
  return buildEmailText([
    `${greetingName(name)}, desta vez o envio não foi aprovado.`,
    'Você pode mandar outra mesa quando quiser.',
    `Enviar de novo: ${aventuraUrl()}`,
  ]);
}
