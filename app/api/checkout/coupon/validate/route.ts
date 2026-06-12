import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PLAN_SLUGS } from '@/lib/checkout/plans';
import { CHECKOUT_COUPONS_ENABLED } from '@/lib/checkout/public';
import { resolvePromoCode } from '@/lib/checkout/promo-codes';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  code: z.string().min(1).max(64),
  planSlug: z.enum(PLAN_SLUGS),
});

export async function POST(request: Request) {
  if (!CHECKOUT_COUPONS_ENABLED) {
    return NextResponse.json(
      { error: 'Cupons desativados no checkout.' },
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

  const { data: plan } = await supabase
    .from('plans')
    .select('price_cents')
    .eq('slug', body.planSlug)
    .eq('is_active', true)
    .single();

  if (!plan) {
    return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
  }

  try {
    const admin = createAdminClient();
    const resolved = await resolvePromoCode(
      admin,
      body.code,
      body.planSlug,
      user.id,
      plan.price_cents
    );

    return NextResponse.json({
      valid: true,
      code: resolved.promo.code,
      summary: resolved.summary,
      originalPriceCents: resolved.originalPriceCents,
      discountedPriceCents: resolved.discountedPriceCents,
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
