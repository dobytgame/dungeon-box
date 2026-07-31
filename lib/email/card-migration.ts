import { getSiteUrl } from '@/lib/email/config';
import {
  buildEmailHtml,
  buildEmailText,
  greetingName,
} from '@/lib/email/layout';
import { sendEmail } from '@/lib/email/send';

export const CARD_MIGRATION_SUBJECT =
  'DungeonBox — Atualize seu método de pagamento';

export interface CardMigrationEmailData {
  to: string;
  name?: string | null;
  updateLink: string;
  billingDate: string;
}

export function cardMigrationHtml(data: CardMigrationEmailData): string {
  const name = greetingName(data.name);
  const billing = new Date(data.billingDate).toLocaleDateString('pt-BR');

  return buildEmailHtml({
    subject: CARD_MIGRATION_SUBJECT,
    preheader:
      'Precisamos que você atualize seu cartão para continuar sua assinatura.',
    eyebrow: 'Guilda DungeonBox',
    headline: 'Atualize seu método de pagamento.',
    headlineAccent: 'pagamento',
    paragraphs: [
      `${name}, estamos migrando nossa plataforma de pagamentos para melhorar sua experiência.`,
      `Para garantir a continuidade da sua assinatura com vencimento em <strong style="color:#fff;">${billing}</strong>, precisamos que você atualize seu cartão na nova plataforma.`,
      'O processo leva menos de 2 minutos e seu plano e benefícios permanecem exatamente os mesmos.',
    ],
    bullets: [
      'Seus benefícios de fundador continuam ativos',
      'O valor e a data de cobrança não mudam',
      'Seus dados estão seguros — não armazenamos números de cartão',
    ],
    cta: { label: 'Atualizar meu cartão agora', href: data.updateLink },
    callout: {
      title: 'Prazo para atualização',
      body: `Atualize antes de ${billing} para não ter interrupção na sua assinatura DungeonBox.`,
    },
  });
}

export function cardMigrationText(data: CardMigrationEmailData): string {
  const name = greetingName(data.name);
  const billing = new Date(data.billingDate).toLocaleDateString('pt-BR');

  return buildEmailText([
    `${name}, atualize seu cartão para continuar sua assinatura DungeonBox.`,
    `Vencimento: ${billing}`,
    `Link de atualização: ${data.updateLink}`,
    'Leva menos de 2 minutos.',
  ]);
}

export async function sendCardMigrationEmail(data: CardMigrationEmailData) {
  return sendEmail({
    role: 'billing',
    to: data.to,
    subject: CARD_MIGRATION_SUBJECT,
    html: cardMigrationHtml(data),
    text: cardMigrationText(data),
    tags: [{ name: 'category', value: 'card_migration' }],
  });
}
