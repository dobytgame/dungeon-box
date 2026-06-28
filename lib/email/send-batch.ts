import type { SendEmailResult } from '@/lib/email/send';

/** Resend allows 10 req/s — stay under with margin. */
const BATCH_SIZE = 8;
const BATCH_DELAY_MS = 1_100;
const MAX_RETRIES = 3;

function isRateLimitMessage(message?: string): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes('rate_limit') || lower.includes('too many requests');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWithRetry<T>(
  item: T,
  sendOne: (item: T) => Promise<SendEmailResult>
): Promise<SendEmailResult> {
  let last: SendEmailResult = { sent: false, reason: 'provider_error' };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    last = await sendOne(item);
    if (last.sent) return last;

    if (
      last.reason !== 'provider_error' ||
      !isRateLimitMessage(last.message) ||
      attempt === MAX_RETRIES - 1
    ) {
      return last;
    }

    await delay(BATCH_DELAY_MS * (attempt + 1));
  }

  return last;
}

export interface BatchSendResult {
  sent: number;
  failed: number;
  errors: string[];
}

export async function sendEmailBatch<T extends { email: string }>(
  items: T[],
  sendOne: (item: T) => Promise<SendEmailResult>,
  options: { errorLabel?: (item: T) => string } = {}
): Promise<BatchSendResult> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    if (i > 0) {
      await delay(BATCH_DELAY_MS);
    }

    const chunk = items.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      chunk.map((item) => sendWithRetry(item, sendOne))
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j]!;
      const item = chunk[j]!;
      if (result.sent) {
        sent += 1;
      } else {
        failed += 1;
        if (errors.length < 5) {
          const label = options.errorLabel?.(item) ?? item.email;
          errors.push(`${label}: ${result.message ?? result.reason}`);
        }
      }
    }
  }

  return { sent, failed, errors };
}
