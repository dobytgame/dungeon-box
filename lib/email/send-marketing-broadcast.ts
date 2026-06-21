import { sendEmail } from '@/lib/email/send';
import {
  marketingBroadcastHtml,
  marketingBroadcastText,
  type MarketingBroadcastTemplateData,
} from '@/lib/email/templates/marketing-broadcast';

const SEND_CHUNK_SIZE = 25;

export interface MarketingBroadcastSendResult {
  total: number;
  sent: number;
  failed: number;
  errors: string[];
}

export async function sendMarketingBroadcast(
  emails: string[],
  payload: MarketingBroadcastTemplateData
): Promise<MarketingBroadcastSendResult> {
  const unique = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()))).filter(
    Boolean
  );

  const html = marketingBroadcastHtml(payload);
  const text = marketingBroadcastText(payload);

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < unique.length; i += SEND_CHUNK_SIZE) {
    const chunk = unique.slice(i, i + SEND_CHUNK_SIZE);
    const results = await Promise.all(
      chunk.map((to) =>
        sendEmail({
          role: 'marketing',
          to,
          subject: payload.subject,
          html,
          text,
          tags: [
            { name: 'category', value: 'marketing_broadcast' },
            { name: 'campaign', value: 'admin_console' },
          ],
        })
      )
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j]!;
      const email = chunk[j]!;
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

  return { total: unique.length, sent, failed, errors };
}
