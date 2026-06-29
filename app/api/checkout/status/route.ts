import { NextResponse } from 'next/server';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { resolveEffectivePaymentAmountCents } from '@/lib/payments/effective-amount';
import { reconcilePendingSubscription } from '@/lib/subscriptions/reconcile-pending';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseSubscriptionIds(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((value) => value.trim())
        .filter((value) => UUID_RE.test(value))
    )
  );
}

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ids = parseSubscriptionIds(searchParams.get('ids'));

  if (ids.length === 0) {
    return NextResponse.json(
      { error: 'Informe ao menos uma assinatura.' },
      { status: 400 }
    );
  }

  const { data: owned, error: ownedError } = await supabase
    .from('subscriptions')
    .select(
      'id, status, asaas_subscription_id, stripe_subscription_id, plan_id, shipping_cents, special_notes'
    )
    .eq('user_id', user.id)
    .in('id', ids);

  if (ownedError) {
    return NextResponse.json({ error: ownedError.message }, { status: 500 });
  }

  const found = owned ?? [];
  if (found.length !== ids.length) {
    return NextResponse.json(
      { error: 'Assinatura não encontrada.' },
      { status: 404 }
    );
  }

  for (const subscription of found) {
    if (subscription.status === 'pending') {
      await reconcilePendingSubscription(subscription);
    }
  }

  const admin = createAdminClient();
  const { data: refreshed, error: refreshError } = await admin
    .from('subscriptions')
    .select(
      'id, status, plan_id, user_id, shipping_cents, special_notes, billing_term, combo_total_cents, combo_installments'
    )
    .eq('user_id', user.id)
    .in('id', ids);

  if (refreshError) {
    return NextResponse.json({ error: refreshError.message }, { status: 500 });
  }

  const rows = refreshed ?? [];
  const planIds = Array.from(new Set(rows.map((row) => row.plan_id).filter(Boolean)));

  const [{ data: planRows }, { data: paymentRows }] = await Promise.all([
    planIds.length
      ? admin.from('plans').select('id, slug, name, price_cents').in('id', planIds)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            slug: string;
            name: string;
            price_cents: number;
          }>,
        }),
    admin
      .from('payments')
      .select(
        'subscription_id, amount_cents, status, paid_at, status_detail, installments'
      )
      .in('subscription_id', ids)
      .eq('status', 'approved')
      .order('paid_at', { ascending: true }),
  ]);

  const planById = new Map((planRows ?? []).map((plan) => [plan.id, plan]));

  const subscriptionById = new Map(rows.map((row) => [row.id, row]));

  const paidBySubscription = new Map<string, number>();
  for (const payment of paymentRows ?? []) {
    if (!payment.subscription_id || paidBySubscription.has(payment.subscription_id)) {
      continue;
    }

    const subscription = subscriptionById.get(payment.subscription_id);
    paidBySubscription.set(
      payment.subscription_id,
      resolveEffectivePaymentAmountCents(
        {
          amount_cents: payment.amount_cents ?? 0,
          status_detail: payment.status_detail as string | null,
          installments: payment.installments as number | null,
        },
        subscription
          ? {
              billing_term: subscription.billing_term as string | null,
              combo_total_cents: subscription.combo_total_cents as number | null,
              combo_installments: subscription.combo_installments as number | null,
            }
          : null
      )
    );
  }

  const statuses = rows.map((row) => row.status);
  const allActive = statuses.every((status) => status === 'active');
  const anyPending = statuses.some((status) => status === 'pending');
  const anyFailed = statuses.some((status) =>
    ['cancelled', 'expired', 'past_due'].includes(status)
  );

  let state: 'active' | 'pending' | 'failed';
  if (allActive) {
    state = 'active';
  } else if (anyPending && !anyFailed) {
    state = 'pending';
  } else {
    state = 'failed';
  }

  return NextResponse.json({
    state,
    subscriptions: rows.map((row) => {
      const plan = row.plan_id ? planById.get(row.plan_id) : undefined;
      const billingTerm = (row.billing_term ?? 'monthly') as BillingTerm;
      const comboTotalCents = row.combo_total_cents as number | null;
      let paidAmountCents = paidBySubscription.get(row.id) ?? null;

      if (
        paidAmountCents == null &&
        isComboTerm(billingTerm) &&
        comboTotalCents != null &&
        comboTotalCents > 0
      ) {
        paidAmountCents = comboTotalCents;
      }

      return {
        id: row.id,
        status: row.status,
        planSlug: plan?.slug ?? null,
        planName: plan?.name ?? null,
        priceCents: plan?.price_cents ?? null,
        shippingCents: row.shipping_cents ?? null,
        specialNotes: row.special_notes ?? null,
        paidAmountCents,
      };
    }),
  });
}
