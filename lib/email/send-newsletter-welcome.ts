import { COMPANY } from '@/lib/legal/constants';
import { getRoleEmailAddress } from '@/lib/email/config';
import { sendEmail, type SendEmailResult } from '@/lib/email/send';
import {
  NEWSLETTER_WELCOME_SUBJECT,
  newsletterWelcomeHtml,
  newsletterWelcomeText,
} from '@/lib/email/templates/newsletter-welcome';

export type SendNewsletterWelcomeResult = SendEmailResult;

export async function sendNewsletterWelcomeEmail(
  to: string,
): Promise<SendNewsletterWelcomeResult> {
  return sendEmail({
    role: 'marketing',
    to,
    replyTo: getRoleEmailAddress('support') ?? COMPANY.supportEmail,
    subject: NEWSLETTER_WELCOME_SUBJECT,
    html: newsletterWelcomeHtml(),
    text: newsletterWelcomeText(),
    tags: [{ name: 'category', value: 'newsletter_welcome' }],
  });
}
