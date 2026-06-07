import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  handleStripeInvoicePaid,
  handleStripeSubscriptionUpdated,
} from '@/lib/stripe/webhook-handlers';

export const runtime = 'nodejs';

const HANDLED_EVENTS = new Set([
  'invoice.payment_succeeded',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

function assertAdminEnv() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error('Supabase admin env missing (SUPABASE_SERVICE_ROLE_KEY).');
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook não configurado.' },
      { status: 503 }
    );
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('[stripe-webhook] signature error:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    assertAdminEnv();
    const supabase = createAdminClient();
    let result: 'processed' | 'skipped' = 'skipped';

    switch (event.type) {
      case 'invoice.payment_succeeded':
        result = await handleStripeInvoicePaid(
          supabase,
          event.data.object as Stripe.Invoice
        );
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        result = await handleStripeSubscriptionUpdated(
          supabase,
          event.data.object as Stripe.Subscription
        );
        break;
    }

    return NextResponse.json({
      received: true,
      processed: result === 'processed',
      skipped: result === 'skipped',
    });
  } catch (error) {
    console.error('[stripe-webhook] processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
