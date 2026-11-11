import {
  buildEmailHtml,
  buildEmailText,
  greetingName,
} from '@/lib/email/layout';
import { sendEmail } from '@/lib/email/send';

export const PIX_CARD_MIGRATION_SUBJECT =
  'DungeonBox — Cadastre seu cartão para renovação automática';

export interface PixCardMigrationEmailData {
  to: string;
  name?: string | null;
  updateLink: string;
  billingDate: string;
}

export function pixCardMigrationHtml(data: PixCardMigrationEmailData): string {
  const name = greetingName(data.name);
  const billing = new Date(data.billingDate).toLocaleDateString('pt-BR');

  return buildEmailHtml({
    subject: PIX_CARD_MIGRATION_SUBJECT,
    preheader: 'Pare de pagar PIX todo mês — cadastre o cartão em 2 minutos.',
    eyebrow: 'Guilda DungeonBox',
    headline: 'Renovação automática no cartão.',
    headlineAccent: 'cartão',
    paragraphs: [
      `${name}, sua assinatura DungeonBox hoje renova via <strong style="color:#fff;">PIX manual</strong> a cada mês.`,
      `Para não depender de um novo código todo mês, cadastre um cartão de crédito. A próxima cobrança segue na data de vencimento (<strong style="color:#fff;">${billing}</strong>) — cadastrar agora <strong style="color:#fff;">não antecipa</strong> cobrança, salvo se houver mensalidade em atraso.`,
      'Depois do cadastro, as renovações passam a ser automáticas no cartão, como nas assinaturas com cartão desde o início.',
    ],
    bullets: [
      'Plano, frete e benefícios permanecem iguais',
      'Você deixa de precisar de PIX manual todo mês',
      'Dados seguros — não guardamos o número do cartão',
    ],
    cta: { label: 'Cadastrar cartão agora', href: data.updateLink },
    callout: {
      title: 'Próxima cobrança',
      body: `Vencimento previsto: ${billing}. Se estiver em dia, nada é cobrado ao cadastrar o cartão.`,
    },
  });
}

export function pixCardMigrationText(data: PixCardMigrationEmailData): string {
  const name = greetingName(data.name);
  const billing = new Date(data.billingDate).toLocaleDateString('pt-BR');

  return buildEmailText([
    `${name}, cadastre seu cartão para renovação automática da assinatura DungeonBox.`,
    `Hoje você renova via PIX manual. Próximo vencimento: ${billing}.`,
    `Link: ${data.updateLink}`,
  ]);
}

export async function sendPixCardMigrationEmail(data: PixCardMigrationEmailData) {
  return sendEmail({
    role: 'billing',
    to: data.to,
    subject: PIX_CARD_MIGRATION_SUBJECT,
    html: pixCardMigrationHtml(data),
    text: pixCardMigrationText(data),
    tags: [{ name: 'category', value: 'pix_card_migration' }],
  });
}
