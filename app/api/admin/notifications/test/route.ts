import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminNotification } from '@/lib/admin/notifications';
import { isWebPushConfigured } from '@/lib/admin/push-notifications';

export const runtime = 'nodejs';

type TestKind = 'store' | 'subscription';

function parseKind(value: string | null): TestKind {
  return value === 'subscription' ? 'subscription' : 'store';
}

export async function POST(request: Request) {
  try {
    const { admin, user } = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const kind = parseKind(searchParams.get('kind'));
    const testId = `test-${Date.now()}`;

    const title =
      kind === 'subscription'
        ? 'Teste — assinatura'
        : 'Teste — pedido da loja';
    const body =
      kind === 'subscription'
        ? 'Notificação de teste de assinatura. Sistema operacional.'
        : 'Notificação de teste da loja. Sistema operacional.';

    if (kind === 'subscription') {
      await createAdminNotification(admin, {
        type: 'subscription_pending',
        orderId: testId,
        userId: user.id,
        title,
        body,
        amountCents: 9995,
        paymentMethod: 'credit_card',
        gateway: 'pagarme',
        metadata: { category: 'subscription', isTest: true },
      });
    } else {
      await createAdminNotification(admin, {
        type: 'store_order_payment_pending',
        orderId: testId,
        userId: user.id,
        title,
        body,
        amountCents: 995,
        paymentMethod: 'credit_card',
        gateway: 'pagarme',
        metadata: { category: 'store', isTest: true },
      });
    }

    return NextResponse.json({
      ok: true,
      testId,
      kind,
      pushConfigured: isWebPushConfigured(),
    });
  } catch (error) {
    console.error('[admin] test notification:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível enviar a notificação de teste.',
      },
      { status: 500 }
    );
  }
}
