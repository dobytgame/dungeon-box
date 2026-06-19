import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PLAN_SLUGS, type PlanSlug } from '@/lib/checkout/plans';
import { resolveShippingForCheckout } from '@/lib/shipping/resolve-server';
import { ShippingQuoteError } from '@/lib/shipping/quote';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  planSlugs: z.array(z.enum(PLAN_SLUGS)).min(1).max(3),
  addressId: z.string().uuid(),
  couponCode: z.string().max(64).optional().nullable(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    body = bodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const quotes: Partial<Record<PlanSlug, Awaited<ReturnType<typeof resolveShippingForCheckout>>>> =
    {};

  const promoSupabase = body.couponCode?.trim() ? createAdminClient() : undefined;

  try {
    for (const planSlug of body.planSlugs) {
      quotes[planSlug] = await resolveShippingForCheckout(
        supabase,
        user.id,
        planSlug,
        body.addressId,
        {
          couponCode: body.couponCode,
          promoSupabase,
        }
      );
    }

    return NextResponse.json({ quotes });
  } catch (error) {
    if (error instanceof ShippingQuoteError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[shipping] quote:', error);
    return NextResponse.json(
      { error: 'Não foi possível calcular o frete.' },
      { status: 500 }
    );
  }
}
