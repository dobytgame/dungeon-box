import { NextRequest, NextResponse } from 'next/server';
import {
  extractNotificationDataId,
  validateMpWebhookSignature,
} from '@/lib/mercadopago/webhook-signature';
import {
  handlePaymentEvent,
  handleSubscriptionPreapprovalEvent,
} from '@/lib/subscriptions/webhook-handlers';
import { createAdminClient } from '@/lib/supabase/admin';

interface MpWebhookBody {
  type?: string;
  action?: string;
  data?: { id?: string | number };
}

const SUBSCRIPTION_TYPES = new Set([
  'subscription_preapproval',
  'subscription_preapproval_plan',
  'preapproval',
]);

const PAYMENT_TYPES = new Set(['payment']);

function resolveEventType(
  body: MpWebhookBody | null,
  topic: string | null
): 'subscription' | 'payment' | null {
  const type = body?.type ?? topic ?? '';
  if (SUBSCRIPTION_TYPES.has(type)) return 'subscription';
  if (PAYMENT_TYPES.has(type)) return 'payment';

  const action = body?.action ?? '';
  if (action.includes('preapproval') || action.includes('subscription')) {
    return 'subscription';
  }
  if (action.includes('payment')) return 'payment';

  return null;
}

async function processNotification(
  eventType: 'subscription' | 'payment',
  resourceId: string
) {
  const supabase = createAdminClient();

  if (eventType === 'subscription') {
    await handleSubscriptionPreapprovalEvent(supabase, resourceId);
    return;
  }

  await handlePaymentEvent(supabase, resourceId);
}

async function handleWebhookRequest(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const topic = searchParams.get('topic') ?? searchParams.get('type');

  let body: MpWebhookBody | null = null;
  let rawBody = '';

  if (request.method === 'POST') {
    rawBody = await request.text();
    if (rawBody) {
      try {
        body = JSON.parse(rawBody) as MpWebhookBody;
      } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }
    }
  }

  const dataId = extractNotificationDataId(searchParams, body);
  const signature = request.headers.get('x-signature');
  const requestId = request.headers.get('x-request-id');

  const hasSignatureHeaders = Boolean(signature && requestId);
  if (hasSignatureHeaders) {
    const valid = validateMpWebhookSignature(dataId, signature, requestId);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  const resourceId =
    dataId ??
    (body?.data?.id != null ? String(body.data.id) : null) ??
    searchParams.get('id');

  if (!resourceId) {
    return NextResponse.json({ error: 'Missing resource id' }, { status: 400 });
  }

  const eventType = resolveEventType(body, topic);
  if (!eventType) {
    console.log('[mp-webhook] ignored notification', {
      type: body?.type,
      action: body?.action,
      topic,
      resourceId,
    });
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    await processNotification(eventType, resourceId);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[mp-webhook] processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

/** Webhooks modernos (JSON + x-signature). */
export async function POST(request: NextRequest) {
  return handleWebhookRequest(request);
}

/** IPN legado (?topic=&id=) — sem assinatura; recurso validado via API MP. */
export async function GET(request: NextRequest) {
  return handleWebhookRequest(request);
}
