import {
  buildEmailHtml,
  buildEmailText,
  greetingName,
} from '@/lib/email/layout';

export const PASSWORD_RESET_SUBJECT = 'Redefinir sua senha — DungeonBox';

export interface PasswordResetTemplateData {
  name?: string | null;
  resetUrl: string;
}

export function passwordResetHtml(data: PasswordResetTemplateData): string {
  const name = greetingName(data.name);

  return buildEmailHtml({
    subject: PASSWORD_RESET_SUBJECT,
    preheader: 'Link seguro para criar uma nova senha. Válido por 24 horas.',
    eyebrow: 'Guilda',
    headline: `Nova senha, ${name}.`,
    headlineAccent: name,
    paragraphs: [
      'Recebemos um pedido para redefinir a senha da sua conta na DungeonBox.',
      'Se foi você, use o botão abaixo. O link é de uso único e <strong style="color:#fff;">expira em 24 horas</strong>.',
      'Se não pediu essa alteração, pode ignorar este e-mail — sua senha atual continua valendo.',
    ],
    cta: { label: 'Redefinir senha', href: data.resetUrl },
    callout: {
      title: 'Dica de segurança',
      body: 'Nunca compartilhe este link. A equipe DungeonBox nunca pede sua senha por e-mail.',
    },
    footerNote: 'Por segurança, este link deixa de funcionar após o primeiro uso.',
  });
}

export function passwordResetText(data: PasswordResetTemplateData): string {
  const name = greetingName(data.name);

  return buildEmailText([
    `Olá, ${name}.`,
    'Pedido de redefinição de senha na DungeonBox.',
    `Link (24h): ${data.resetUrl}`,
    'Se não foi você, ignore este e-mail.',
  ]);
}
