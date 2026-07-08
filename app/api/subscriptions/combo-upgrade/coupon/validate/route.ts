import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CHECKOUT_COUPONS_ENABLED } from '@/lib/checkout/public';
import { previewComboUpgradePricing } from '@/lib/subscriptions/combo-upgrade';
import { createClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  subscriptionId: z.string().uuid(),
  code: z.string().min(1).max(64),
});

export async function POST(request: Request) {
  if (!CHECKOUT_COUPONS_ENABLED) {
    return NextResponse.json(
      { error: 'Cupons desativados.' },
      { status: 403 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(
      'id, user_id, status, plan_id, address_id, asaas_subscription_id, asaas_customer_id, pending_plan_id, pending_billing_term, billing_term, promo_code, shipping_cents, shipping_region, special_notes, plans!plan_id(id, slug, name, price_cents)'
    )
    .eq('id', body.subscriptionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!subscription) {
    return NextResponse.json(
      { error: 'Assinatura não encontrada.' },
      { status: 404 }
    );
  }

  try {
    const preview = await previewComboUpgradePricing(
      subscription,
      user.id,
      body.code
    );

    if (!preview) {
      return NextResponse.json(
        { error: 'Upgrade para combo indisponível para esta assinatura.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      code: preview.promoCode ?? body.code.trim().toUpperCase(),
      summary: preview.promoSummary,
      options: preview.options,
    });
  } catch (error) {
    return NextResponse.json(
      {
        valid: false,
        error:
          error instanceof Error ? error.message : 'Cupom inválido.',
      },
      { status: 400 }
    );
  }
}
