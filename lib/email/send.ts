import { COMPANY } from '@/lib/legal/constants';
import type { EmailSenderRole } from '@/lib/email/config';
import { getEmailFrom, isEmailConfigured } from '@/lib/email/config';
import { getResendClient } from '@/lib/email/resend';
import { buildMarketingListUnsubscribeHeaders } from '@/lib/email/unsubscribe';

export type SendEmailResult =
  | { sent: true; id: string }
  | { sent: false; reason: 'not_configured' | 'provider_error'; message?: string };

const MARKETING_ROLES: EmailSenderRole[] = ['marketing', 'newsletter'];

export interface SendEmailInput {
  role: EmailSenderRole;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  /** Cabeçalhos extras (ex.: List-Unsubscribe). */
  headers?: Record<string, string>;
  /**
   * Inclui List-Unsubscribe one-click (obrigatório para marketing em Gmail/Yahoo).
   * Padrão: true para roles marketing/newsletter.
   */
  includeListUnsubscribe?: boolean;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!isEmailConfigured(input.role)) {
    console.warn(`[email] Resend não configurado para ${input.role} — envio ignorado.`);
    return { sent: false, reason: 'not_configured' };
  }

  const includeListUnsubscribe =
    input.includeListUnsubscribe ?? MARKETING_ROLES.includes(input.role);

  const headers: Record<string, string> = {
    ...(includeListUnsubscribe
      ? buildMarketingListUnsubscribeHeaders(input.to)
      : {}),
    ...(input.headers ?? {}),
  };

  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: getEmailFrom(input.role),
      to: input.to,
      replyTo: input.replyTo ?? COMPANY.supportEmail,
      subject: input.subject,
      html: input.html,
      text: input.text,
      tags: input.tags,
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    });

    if (error) {
      console.error(`[email] ${input.tags?.[0]?.value ?? input.role} failed:`, error);
      return { sent: false, reason: 'provider_error', message: error.message };
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
    console.error(`[email] ${input.role} error:`, err);
    return {
      sent: false,
      reason: 'provider_error',
      message: err instanceof Error ? err.message : 'Erro desconhecido',
    };
  }
}
