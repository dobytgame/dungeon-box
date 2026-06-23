import { NextResponse } from 'next/server';
import { syncStoreOrderPaymentByOrderId } from '@/lib/asaas/store-order-payment';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId')?.trim() ?? '';

  if (!UUID_RE.test(orderId)) {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const result = await syncStoreOrderPaymentByOrderId(admin, user.id, orderId);

  if (result.state === 'not_found') {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({
    state: result.state,
    pix: result.pix ?? null,
    order: result.order ?? null,
  });
}
