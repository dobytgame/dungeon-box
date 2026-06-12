import { NextResponse } from 'next/server';
import {
  handleAsaasPaymentConfirmed,
  handleAsaasPaymentOverdue,
  handleAsaasPaymentRefunded,
  type AsaasWebhookPayment,
} from '@/lib/asaas/webhook-handlers';
import { validateAsaasWebhookToken } from '@/lib/asaas/webhook-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const PAYMENT_CONFIRM_EVENTS = new Set([
  'PAYMENT_CONFIRMED',
  'PAYMENT_RECEIVED',
]);

const PAYMENT_OVERDUE_EVENTS = new Set(['PAYMENT_OVERDUE']);

const PAYMENT_REFUND_EVENTS = new Set([
  'PAYMENT_REFUNDED',
  'PAYMENT_PARTIALLY_REFUNDED',
]);

type AsaasWebhookBody = {
  event?: string;
  payment?: AsaasWebhookPayment;
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
  const token = request.headers.get('asaas-access-token');
  if (!validateAsaasWebhookToken(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  let body: AsaasWebhookBody;
  try {
    body = (await request.json()) as AsaasWebhookBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = body.event?.trim();
  const payment = body.payment;

  if (!event || !payment?.id) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    assertAdminEnv();
    const supabase = createAdminClient();
    let result: 'processed' | 'skipped' = 'skipped';

    if (PAYMENT_CONFIRM_EVENTS.has(event)) {
      result = await handleAsaasPaymentConfirmed(supabase, payment);
      if (result === 'skipped') {
        console.warn('[asaas-webhook] payment confirmed but local subscription not found', {
          event,
          paymentId: payment.id,
          subscription: payment.subscription,
          externalReference: payment.externalReference,
        });
      }
    } else if (PAYMENT_OVERDUE_EVENTS.has(event)) {
      result = await handleAsaasPaymentOverdue(supabase, payment);
    } else if (PAYMENT_REFUND_EVENTS.has(event)) {
      result = await handleAsaasPaymentRefunded(supabase, payment);
    } else {
      return NextResponse.json({ received: true, ignored: true });
    }

    return NextResponse.json({
      received: true,
      processed: result === 'processed',
      skipped: result === 'skipped',
    });
  } catch (error) {
    console.error('[asaas-webhook] processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
