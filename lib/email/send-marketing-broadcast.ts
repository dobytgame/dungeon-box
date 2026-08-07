import { sendEmail } from '@/lib/email/send';
import { sendEmailBatch } from '@/lib/email/send-batch';
import {
  marketingBroadcastHtml,
  marketingBroadcastText,
  type MarketingBroadcastTemplateData,
} from '@/lib/email/templates/marketing-broadcast';

export interface MarketingBroadcastSendResult {
  total: number;
  sent: number;
  failed: number;
  errors: string[];
}

export async function sendMarketingBroadcast(
  emails: string[],
  payload: Omit<MarketingBroadcastTemplateData, 'recipientEmail'>
): Promise<MarketingBroadcastSendResult> {
  const unique = Array.from(
    new Set(emails.map((e) => e.trim().toLowerCase()))
  ).filter(Boolean);

  const list = unique.map((email) => ({ email }));

  const { sent, failed, errors } = await sendEmailBatch(list, (recipient) => {
    const data: MarketingBroadcastTemplateData = {
      ...payload,
      recipientEmail: recipient.email,
    };
    return sendEmail({
      role: 'marketing',
      to: recipient.email,
      subject: payload.subject,
      html: marketingBroadcastHtml(data),
      text: marketingBroadcastText(data),
      tags: [
        { name: 'category', value: 'marketing_broadcast' },
        { name: 'campaign', value: 'admin_console' },
      ],
    });
  });

  return { total: list.length, sent, failed, errors };
}
