import { NextResponse } from 'next/server';
import { z } from 'zod';
import { userFacingStripeError } from '@/lib/stripe/errors';
import {
  resolvePromotionCode,
  stripeCouponsEnabled,
} from '@/lib/stripe/promotion-code';
import { STRIPE_CONFIGURED } from '@/lib/stripe/server';

const bodySchema = z.object({
  code: z.string().min(1).max(64),
});

export async function POST(request: Request) {
  if (!STRIPE_CONFIGURED) {
    return NextResponse.json(
      { error: 'Stripe não configurado.' },
      { status: 503 }
    );
  }

  if (!stripeCouponsEnabled()) {
    return NextResponse.json(
      { error: 'Cupons de desconto não estão habilitados.' },
      { status: 403 }
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    body = bodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: 'Código inválido.' }, { status: 400 });
  }

  try {
    const promotion = await resolvePromotionCode(body.code);
    return NextResponse.json({
      valid: true,
      code: promotion.code,
      promotionCodeId: promotion.id,
      summary: promotion.summary,
    });
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: userFacingStripeError(error) },
      { status: 422 }
    );
  }
}
