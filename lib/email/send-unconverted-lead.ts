import { sendEmail } from '@/lib/email/send';
import {
  UNCONVERTED_LEAD_SUBJECT,
  unconvertedLeadHtml,
  unconvertedLeadText,
} from '@/lib/email/templates/unconverted-lead';

const SEND_CHUNK_SIZE = 25;

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

  const list = Array.from(unique.values());
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < list.length; i += SEND_CHUNK_SIZE) {
    const chunk = list.slice(i, i + SEND_CHUNK_SIZE);
    const results = await Promise.all(
      chunk.map((recipient) =>
        sendEmail({
          role: 'marketing',
          to: recipient.email,
          subject: UNCONVERTED_LEAD_SUBJECT,
          html: unconvertedLeadHtml({ name: recipient.name }),
          text: unconvertedLeadText({ name: recipient.name }),
          tags: [
            { name: 'category', value: 'unconverted_lead' },
            { name: 'campaign', value: 'admin_console' },
          ],
        })
      )
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j]!;
      const email = chunk[j]!.email;
      if (result.sent) {
        sent += 1;
      } else {
        failed += 1;
        if (errors.length < 5) {
          errors.push(`${email}: ${result.message ?? result.reason}`);
        }
      }
    }
  }

  return { total: list.length, sent, failed, errors };
}
