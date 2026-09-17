import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientIpFromRequest } from '@/lib/asaas/client-ip';
import { getStorePaymentConfig } from '@/lib/store/payment-config';
import { chargeCustomStoreOrder } from '@/lib/store/custom-order';
import {
  digitsOnly,
  validateCreditCard,
} from '@/lib/payments/card-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const cardSchema = z.object({
  holderName: z.string().min(2),
  number: z.string().min(13),
  expiryMonth: z.string().min(1),
  expiryYear: z.string().min(2),
  ccv: z.string().min(3),
});

const bodySchema = z.discriminatedUnion('paymentMethod', [
  z
    .object({
      token: z.string().min(8),
      paymentMethod: z.literal('credit_card'),
      creditCard: cardSchema.optional(),
      cardToken: z.string().min(1).optional(),
    })
    .refine((body) => Boolean(body.creditCard || body.cardToken), {
      message: 'Informe o cartão ou o token de pagamento.',
    }),
  z.object({
    token: z.string().min(8),
    paymentMethod: z.literal('pix'),
  }),
]);

export async function POST(request: Request) {
  const paymentConfig = await getStorePaymentConfig();

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  try {
    if (body.paymentMethod === 'pix') {
      const result = await chargeCustomStoreOrder({
        token: body.token,
        paymentMethod: 'pix',
      });

      if ('error' in result) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
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

      const result = await chargeCustomStoreOrder({
        token: body.token,
        paymentMethod: 'credit_card',
        cardToken: body.cardToken,
      });

      if ('error' in result) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }

      if ('pending' in result) {
        return NextResponse.json({
          pending: true,
          orderId: result.orderId,
          paymentId: result.paymentId,
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
      number: digitsOnly(body.creditCard.number),
      expiryMonth: body.creditCard.expiryMonth,
      expiryYear: body.creditCard.expiryYear,
      ccv: body.creditCard.ccv,
    });

    if (!cardValidation.ok) {
      return NextResponse.json({ error: cardValidation.error }, { status: 400 });
    }

    const result = await chargeCustomStoreOrder({
      token: body.token,
      paymentMethod: 'credit_card',
      creditCard: cardValidation.normalized,
      creditCardHolderInfo: {
        name: holderName,
        email: '',
        cpfCnpj: '',
        postalCode: '',
        addressNumber: '',
        phone: '',
      },
      remoteIp: getClientIpFromRequest(request),
      request,
    });

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    if ('pending' in result) {
      return NextResponse.json({
        pending: true,
        orderId: result.orderId,
        paymentId: result.paymentId,
        awaitingReview: result.awaitingReview ?? false,
      });
    }

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      paymentId: result.paymentId,
    });
  } catch (error) {
    console.error('[store] custom order pay api:', error);
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
