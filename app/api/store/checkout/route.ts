import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientIpFromRequest } from '@/lib/asaas/client-ip';
import {
  getStorePaymentConfig,
  isStorePaymentReady,
} from '@/lib/store/payment-config';
import { purchaseStoreOrder } from '@/lib/store/checkout';
import { createClient } from '@/lib/supabase/server';
import { assertPublicStoreCheckoutItems } from '@/lib/store/access';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  digitsOnly,
  validateCreditCard,
} from '@/lib/payments/card-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const cartItemsSchema = z
  .array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1).max(99),
      selectedOptions: z.record(z.string(), z.string()).optional(),
      themeId: z.string().uuid().optional(),
      itemUploads: z.array(z.string().min(1)).optional(),
    })
  )
  .min(1);

const cardSchema = z.object({
  holderName: z.string().min(2),
  number: z.string().min(13),
  expiryMonth: z.string().min(1),
  expiryYear: z.string().min(2),
  ccv: z.string().min(3),
});

const sharedCheckoutSchema = z.object({
  items: cartItemsSchema,
  addressId: z.string().uuid(),
  bundleSubscriptionId: z.string().uuid().nullable().optional(),
  couponCode: z.string().max(64).nullable().optional(),
});

const bodySchema = z.discriminatedUnion('paymentMethod', [
  sharedCheckoutSchema
    .extend({
      paymentMethod: z.literal('credit_card'),
      creditCard: cardSchema.optional(),
      cardToken: z.string().min(1).optional(),
    })
    .refine((body) => Boolean(body.creditCard || body.cardToken), {
      message: 'Informe o cartão ou o token de pagamento.',
    }),
  sharedCheckoutSchema.extend({
    paymentMethod: z.literal('pix'),
  }),
]);

function normalizeCardNumber(value: string): string {
  return digitsOnly(value);
}

async function validateProfileAndAddress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  addressId: string
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, cpf, phone')
    .eq('id', userId)
    .single();

  if (!profile?.email) {
    return {
      error: NextResponse.json(
        { error: 'Complete seu perfil antes de comprar.' },
        { status: 422 }
      ),
    };
  }

  const cpf = profile.cpf?.replace(/\D/g, '') ?? '';
  const phone = profile.phone?.replace(/\D/g, '') ?? '';

  if (cpf.length !== 11) {
    return {
      error: NextResponse.json(
        { error: 'CPF obrigatório. Atualize seu perfil.' },
        { status: 422 }
      ),
    };
  }

  if (phone.length < 10) {
    return {
      error: NextResponse.json(
        { error: 'Telefone obrigatório. Atualize seu perfil.' },
        { status: 422 }
      ),
    };
  }

  const { data: address } = await supabase
    .from('addresses')
    .select('number, zip_code, complement')
    .eq('id', addressId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!address) {
    return {
      error: NextResponse.json(
        { error: 'Endereço de entrega inválido.' },
        { status: 400 }
      ),
    };
  }

  return { profile, address, cpf, phone };
}

export async function POST(request: Request) {
  if (!(await isStorePaymentReady())) {
    const config = await getStorePaymentConfig();
    return NextResponse.json(
      {
        error:
          config.issue ??
          'Pagamentos da loja indisponíveis no gateway ativo.',
      },
      { status: 503 }
    );
  }

  const paymentConfig = await getStorePaymentConfig();

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

  const validation = await validateProfileAndAddress(
    supabase,
    user.id,
    body.addressId
  );
  if ('error' in validation && validation.error) {
    return validation.error;
  }

  const { profile, address, cpf, phone } = validation;

  const checkoutGuard = await assertPublicStoreCheckoutItems(
    createAdminClient(),
    body.items.map((item) => item.productId)
  );
  if ('error' in checkoutGuard) {
    return NextResponse.json({ error: checkoutGuard.error }, { status: 403 });
  }

  const sharedInput = {
    supabase,
    userId: user.id,
    items: body.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      ...(item.selectedOptions ? { selectedOptions: item.selectedOptions } : {}),
      ...(item.itemUploads ? { itemUploads: item.itemUploads } : {}),
    })),
    addressId: body.addressId,
    bundleSubscriptionId: body.bundleSubscriptionId ?? null,
    couponCode: body.couponCode ?? null,
  };

  try {
    if (body.paymentMethod === 'pix') {
      const result = await purchaseStoreOrder({
        ...sharedInput,
        paymentMethod: 'pix',
      });

      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      if ('pending' in result) {
        return NextResponse.json({
          pending: true,
          orderId: result.orderId,
          paymentId: result.paymentId,
          pix: result.pix,
          awaitingReview: result.awaitingReview ?? false,
        });
      }

      return NextResponse.json({
        success: true,
        orderId: result.orderId,
        paymentId: result.paymentId,
      });
    }

    if (paymentConfig.provider === 'pagarme') {
      if (!body.cardToken) {
        return NextResponse.json(
          { error: 'Token do cartão obrigatório.' },
          { status: 400 }
        );
      }

      const result = await purchaseStoreOrder({
        ...sharedInput,
        paymentMethod: 'credit_card',
        cardToken: body.cardToken,
      });

      if ('error' in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      if ('pending' in result) {
        return NextResponse.json({
          pending: true,
          orderId: result.orderId,
          paymentId: result.paymentId,
          pix: result.pix,
          awaitingReview: result.awaitingReview ?? false,
        });
      }

      return NextResponse.json({
        success: true,
        orderId: result.orderId,
        paymentId: result.paymentId,
      });
    }

    if (!body.creditCard) {
      return NextResponse.json(
        { error: 'Dados do cartão obrigatórios.' },
        { status: 400 }
      );
    }

    const holderName = body.creditCard.holderName.trim();
    const cardValidation = validateCreditCard({
      holderName,
      number: normalizeCardNumber(body.creditCard.number),
      expiryMonth: body.creditCard.expiryMonth,
      expiryYear: body.creditCard.expiryYear,
      ccv: body.creditCard.ccv,
    });

    if (!cardValidation.ok) {
      return NextResponse.json({ error: cardValidation.error }, { status: 400 });
    }

    const creditCard = cardValidation.normalized;

    const creditCardHolderInfo = {
      name: profile!.full_name?.trim() || holderName,
      email: profile!.email,
      cpfCnpj: cpf!,
      postalCode: address!.zip_code.replace(/\D/g, ''),
      addressNumber: address!.number,
      addressComplement: address!.complement ?? undefined,
      phone: phone!,
    };

    const result = await purchaseStoreOrder({
      ...sharedInput,
      paymentMethod: 'credit_card',
      creditCard,
      creditCardHolderInfo,
      remoteIp: getClientIpFromRequest(request),
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if ('pending' in result) {
      return NextResponse.json({
        pending: true,
        orderId: result.orderId,
        paymentId: result.paymentId,
        pix: result.pix,
        awaitingReview: result.awaitingReview ?? false,
      });
    }

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      paymentId: result.paymentId,
    });
  } catch (error) {
    console.error('[store] checkout api:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível processar o pagamento.',
      },
      { status: 500 }
    );
  }
}
