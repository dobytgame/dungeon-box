import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PLAN_SLUGS, type PlanSlug } from '@/lib/checkout/plans';
import { CHECKOUT_COUPONS_ENABLED } from '@/lib/checkout/public';
import { resolvePromoCode } from '@/lib/checkout/promo-codes';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const bodySchema = z
  .object({
    code: z.string().min(1).max(64),
    planSlug: z.enum(PLAN_SLUGS).optional(),
    planSlugs: z.array(z.enum(PLAN_SLUGS)).min(1).max(3).optional(),
  })
  .refine((value) => value.planSlug || (value.planSlugs?.length ?? 0) > 0, {
    message: 'Informe ao menos um plano.',
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

  const slugs: PlanSlug[] = body.planSlugs?.length
    ? Array.from(new Set(body.planSlugs))
    : body.planSlug
      ? [body.planSlug]
      : [];

  const admin = createAdminClient();
  const discounts: Partial<
    Record<
      PlanSlug,
      {
        originalPriceCents: number;
        discountedPriceCents: number;
        summary: string;
      }
    >
  > = {};
  let appliedCode: string | null = null;
  let lastError: string | null = null;

  for (const planSlug of slugs) {
    const { data: plan } = await supabase
      .from('plans')
      .select('price_cents')
      .eq('slug', planSlug)
      .eq('is_active', true)
      .single();

    if (!plan) {
      return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
    }

    try {
      const resolved = await resolvePromoCode(
        admin,
        body.code,
        planSlug,
        user.id,
        plan.price_cents
      );
      discounts[planSlug] = {
        originalPriceCents: resolved.originalPriceCents,
        discountedPriceCents: resolved.discountedPriceCents,
        summary: resolved.summary,
      };
      appliedCode = resolved.promo.code;
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : 'Cupom inválido.';
    }
  }

  if (!appliedCode || Object.keys(discounts).length === 0) {
    return NextResponse.json(
      {
        valid: false,
        error: lastError ?? 'Cupom inválido para os planos selecionados.',
      },
      { status: 400 }
    );
  }

  const summaries = Array.from(new Set(Object.values(discounts).map((d) => d.summary)));
  const summary =
    summaries.length === 1
      ? summaries[0]
      : summaries.join(' · ');

  return NextResponse.json({
    valid: true,
    code: appliedCode,
    summary,
    discounts,
  });
}
