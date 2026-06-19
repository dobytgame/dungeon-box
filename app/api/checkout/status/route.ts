import { NextResponse } from 'next/server';
import { reconcilePendingAsaasSubscription } from '@/lib/asaas/payment-sync';
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
    .select('id, status, asaas_subscription_id, plan_id')
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
    if (
      subscription.status === 'pending' &&
      subscription.asaas_subscription_id
    ) {
      await reconcilePendingAsaasSubscription(subscription);
    }
  }

  const admin = createAdminClient();
  const { data: refreshed, error: refreshError } = await admin
    .from('subscriptions')
    .select('id, status, plan_id, user_id')
    .eq('user_id', user.id)
    .in('id', ids);

  if (refreshError) {
    return NextResponse.json({ error: refreshError.message }, { status: 500 });
  }

  const rows = refreshed ?? [];
  const planIds = Array.from(new Set(rows.map((row) => row.plan_id).filter(Boolean)));
  const { data: planRows } = planIds.length
    ? await admin.from('plans').select('id, slug, name, price_cents').in('id', planIds)
    : { data: [] as Array<{ id: string; slug: string; name: string; price_cents: number }> };

  const planById = new Map((planRows ?? []).map((plan) => [plan.id, plan]));

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
      return {
        id: row.id,
        status: row.status,
        planSlug: plan?.slug ?? null,
        planName: plan?.name ?? null,
        priceCents: plan?.price_cents ?? null,
      };
    }),
  });
}
