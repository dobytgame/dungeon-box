import { NextResponse } from 'next/server';
import { getResendClient } from '@/lib/email/resend';
import { suppressEmail } from '@/lib/email/suppressions';
import { normalizeEmailAddress } from '@/lib/email/unsubscribe';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type ResendWebhookEvent = {
  type?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    bounce?: { message?: string; type?: string };
  };
};

function firstRecipient(to: string[] | string | undefined): string | null {
  if (!to) return null;
  if (typeof to === 'string') return normalizeEmailAddress(to);
  const first = to[0];
  return first ? normalizeEmailAddress(first) : null;
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET missing');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const payload = await request.text();
  const id = request.headers.get('svix-id') ?? '';
  const timestamp = request.headers.get('svix-timestamp') ?? '';
  const signature = request.headers.get('svix-signature') ?? '';

  let event: ResendWebhookEvent;
  try {
    const resend = getResendClient();
    event = resend.webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret: secret,
    }) as ResendWebhookEvent;
  } catch (error) {
    console.error('[resend-webhook] verify failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const type = event.type?.trim();
  const email = firstRecipient(event.data?.to);
  const resendEmailId = event.data?.email_id ?? null;

  if (!type || !email) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const admin = createAdminClient();

    if (type === 'email.complained') {
      await suppressEmail(admin, {
        email,
        reason: 'complaint',
        source: 'resend_webhook',
        resendEmailId,
      });
      console.warn('[resend-webhook] spam complaint suppressed:', email);
    } else if (type === 'email.bounced') {
      const bounceType = event.data?.bounce?.type?.toLowerCase() ?? '';
      // Soft bounces are temporary — only suppress hard/permanent.
      if (
        bounceType.includes('hard') ||
        bounceType.includes('permanent') ||
        !bounceType
      ) {
        await suppressEmail(admin, {
          email,
          reason: 'hard_bounce',
          source: 'resend_webhook',
          resendEmailId,
        });
        console.warn('[resend-webhook] bounce suppressed:', email, bounceType);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[resend-webhook] handler error:', error);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}
