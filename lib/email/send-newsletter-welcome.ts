import { COMPANY } from '@/lib/legal/constants';
import { getEmailFrom, isEmailConfigured } from '@/lib/email/config';
import { getResendClient } from '@/lib/email/resend';
import {
  NEWSLETTER_WELCOME_SUBJECT,
  newsletterWelcomeHtml,
  newsletterWelcomeText,
} from '@/lib/email/templates/newsletter-welcome';

export type SendNewsletterWelcomeResult =
  | { sent: true; id: string }
  | { sent: false; reason: 'not_configured' | 'provider_error'; message?: string };

export async function sendNewsletterWelcomeEmail(
  to: string,
): Promise<SendNewsletterWelcomeResult> {
  if (!isEmailConfigured()) {
    console.warn('[email] Resend não configurado — e-mail de boas-vindas ignorado.');
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: getEmailFrom(),
      to,
      replyTo: COMPANY.supportEmail,
      subject: NEWSLETTER_WELCOME_SUBJECT,
      html: newsletterWelcomeHtml(),
      text: newsletterWelcomeText(),
      tags: [{ name: 'category', value: 'newsletter_welcome' }],
    });

    if (error) {
      console.error('[email] newsletter welcome failed:', error);
      return {
        sent: false,
        reason: 'provider_error',
        message: error.message,
      };
    }

    if (!data?.id) {
      return {
        sent: false,
        reason: 'provider_error',
        message: 'Resend não retornou id do envio.',
      };
    }

    return { sent: true, id: data.id };
  } catch (err) {
    console.error('[email] newsletter welcome error:', err);
    return {
      sent: false,
      reason: 'provider_error',
      message: err instanceof Error ? err.message : 'Erro desconhecido',
    };
  }
}
