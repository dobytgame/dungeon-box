import { NextResponse } from 'next/server';
import { z } from 'zod';
import { STORE_COUPONS_ENABLED } from '@/lib/store/public';
import { resolveStorePromoCode } from '@/lib/store/promo-codes';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  code: z.string().min(1).max(64),
  subtotalCents: z.number().int().min(1),
  standaloneShipping: z.boolean().optional().default(true),
  shippingCents: z.number().int().min(0).optional().default(0),
});

export async function POST(request: Request) {
  if (!STORE_COUPONS_ENABLED) {
    return NextResponse.json(
      { error: 'Cupons desativados na loja.' },
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

  const admin = createAdminClient();

  try {
    const resolved = await resolveStorePromoCode(
      admin,
      body.code,
      user.id,
      body.subtotalCents,
      {
        standaloneShipping: body.standaloneShipping,
        shippingCents: body.shippingCents,
      }
    );

    return NextResponse.json({
      valid: true,
      code: resolved.promo.code,
      summary: resolved.summary,
      originalSubtotalCents: resolved.originalSubtotalCents,
      discountedSubtotalCents: resolved.discountedSubtotalCents,
      subtotalDiscountCents: resolved.subtotalDiscountCents,
      freeShipping: resolved.freeShipping,
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
