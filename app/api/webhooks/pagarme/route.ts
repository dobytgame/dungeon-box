import { NextResponse } from 'next/server';
import {
  handlePagarmeChargeFailed,
  handlePagarmeChargePaid,
  handlePagarmeOrderPaid,
  handlePagarmeOrderPaymentFailed,
  handlePagarmeSubscriptionActive,
  handlePagarmeSubscriptionCanceled,
  type PagarmeWebhookCharge,
  type PagarmeWebhookOrder,
  type PagarmeWebhookSubscription,
} from '@/lib/pagarme/webhook-handlers';
import { validatePagarmeWebhookSignature } from '@/lib/pagarme/webhook-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type PagarmeWebhookBody = {
  type?: string;
  data?: (PagarmeWebhookCharge & PagarmeWebhookSubscription & PagarmeWebhookOrder);
};

function assertAdminEnv() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error('Supabase admin env missing (SUPABASE_SERVICE_ROLE_KEY).');
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature =
    request.headers.get('x-hub-signature') ??
    request.headers.get('X-Hub-Signature');

  if (!validatePagarmeWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: PagarmeWebhookBody;
  try {
    body = JSON.parse(rawBody) as PagarmeWebhookBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = body.type?.trim();
  const data = body.data;

  if (!event || !data) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    assertAdminEnv();
    const supabase = createAdminClient();
    let result: 'processed' | 'skipped' = 'skipped';

    switch (event) {
      case 'charge.paid':
        result = await handlePagarmeChargePaid(supabase, data);
        break;
      case 'order.paid':
        result = await handlePagarmeOrderPaid(supabase, data);
        break;
      case 'order.payment_failed':
        result = await handlePagarmeOrderPaymentFailed(supabase, data);
        break;
      case 'charge.payment_failed':
      case 'charge.failed':
        result = await handlePagarmeChargeFailed(supabase, data);
        break;
      case 'subscription.canceled':
      case 'subscription.cancelled':
        result = await handlePagarmeSubscriptionCanceled(supabase, data);
        break;
      case 'subscription.updated':
      case 'subscription.activated':
      case 'subscription.active':
        if (data.status === 'active' || event.includes('activated')) {
          result = await handlePagarmeSubscriptionActive(supabase, data);
        }
        break;
      default:
        return NextResponse.json({ received: true, ignored: true });
    }

    return NextResponse.json({
      received: true,
      processed: result === 'processed',
      skipped: result === 'skipped',
    });
  } catch (error) {
    console.error('[pagarme-webhook] processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
