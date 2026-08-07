import { sendEmail } from '@/lib/email/send';
import { sendEmailBatch } from '@/lib/email/send-batch';
import {
  UNCONVERTED_LEAD_SUBJECT,
  unconvertedLeadHtml,
  unconvertedLeadText,
} from '@/lib/email/templates/unconverted-lead';

export interface UnconvertedLeadRecipient {
  email: string;
  name?: string | null;
}

export interface UnconvertedLeadSendResult {
  total: number;
  sent: number;
  failed: number;
  errors: string[];
}

export async function sendUnconvertedLeadCampaign(
  recipients: UnconvertedLeadRecipient[]
): Promise<UnconvertedLeadSendResult> {
  const unique = new Map<string, UnconvertedLeadRecipient>();
  for (const recipient of recipients) {
    const email = recipient.email.trim().toLowerCase();
    if (!email) continue;
    unique.set(email, { email, name: recipient.name });
  }

  const list = Array.from(unique.values()).map((recipient) => ({
    email: recipient.email,
    name: recipient.name,
  }));

  const { sent, failed, errors } = await sendEmailBatch(list, (recipient) =>
    sendEmail({
      role: 'marketing',
      to: recipient.email,
      subject: UNCONVERTED_LEAD_SUBJECT,
      html: unconvertedLeadHtml({
        name: recipient.name,
        recipientEmail: recipient.email,
      }),
      text: unconvertedLeadText({
        name: recipient.name,
        recipientEmail: recipient.email,
      }),
      tags: [
        { name: 'category', value: 'unconverted_lead' },
        { name: 'campaign', value: 'admin_console' },
      ],
    })
  );

  return { total: list.length, sent, failed, errors };
}
