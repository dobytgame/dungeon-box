import { getSiteUrl } from '@/lib/email/config';
import {
  buildEmailHtml,
  buildEmailText,
  escapeHtml,
  greetingName,
} from '@/lib/email/layout';

export const ACCOUNT_CREATED_SUBJECT = 'Sua conta na Guilda foi forjada — DungeonBox';

export interface AccountCreatedTemplateData {
  name?: string | null;
  confirmUrl?: string | null;
}

export function accountCreatedHtml(data: AccountCreatedTemplateData): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();
  const dashboardUrl = `${siteUrl}/dashboard`;
  const confirmUrl = data.confirmUrl ?? `${siteUrl}/auth`;

  return buildEmailHtml({
    subject: ACCOUNT_CREATED_SUBJECT,
    preheader: 'Confirme seu e-mail e entre no painel do Mestre.',
    eyebrow: 'Guilda',
    headline: `Bem-vindo, <span style="color:#ff6b2b;">${escapeHtml(name)}</span>.`,
    paragraphs: [
      'Sua conta na DungeonBox foi criada. Falta só um passo para abrir o painel e acompanhar assinatura, entregas e fidelidade.',
      data.confirmUrl
        ? 'Clique no botão abaixo para <strong style="color:#fff;">confirmar seu e-mail</strong>. O link expira em 24 horas por segurança.'
        : 'Se você acabou de se cadastrar, verifique a caixa de entrada — pode haver um e-mail de confirmação separado do provedor de login.',
      'Depois de entrar, você pode escolher um plano, cadastrar o endereço de entrega e receber o primeiro kit mensal.',
    ],
    bullets: [
      'Painel com status da assinatura e próximas cobranças',
      'Rastreio de cada dungeon enviada',
      'Programa de fidelidade da Guilda',
    ],
    cta: data.confirmUrl
      ? { label: 'Confirmar e-mail', href: confirmUrl }
      : { label: 'Ir para o painel', href: dashboardUrl },
    secondaryCta: { label: 'Ver planos', href: `${siteUrl}/#planos` },
    callout: {
      title: 'Não foi você?',
      body: 'Ignore este e-mail. Ninguém terá acesso sem confirmar o endereço.',
    },
  });
}

export function accountCreatedText(data: AccountCreatedTemplateData): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();

  return buildEmailText([
    `Bem-vindo, ${name}.`,
    'Sua conta na DungeonBox foi criada.',
    data.confirmUrl
      ? `Confirme seu e-mail: ${data.confirmUrl}`
      : 'Verifique sua caixa de entrada para confirmar o cadastro.',
    `Painel: ${siteUrl}/dashboard`,
    `Planos: ${siteUrl}/#planos`,
  ]);
}
