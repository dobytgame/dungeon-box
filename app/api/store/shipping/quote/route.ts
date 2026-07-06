import { NextResponse } from 'next/server';
import { z } from 'zod';
import { quoteStoreStandaloneShipping } from '@/lib/store/shipping';
import { ShippingQuoteError } from '@/lib/shipping/quote';
import { createClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  addressId: z.string().uuid(),
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
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const { data: address } = await supabase
    .from('addresses')
    .select('state, zip_code')
    .eq('id', body.addressId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!address) {
    return NextResponse.json({ error: 'Endereço inválido.' }, { status: 404 });
  }

  try {
    const quote = quoteStoreStandaloneShipping({
      state: address.state,
      zip_code: address.zip_code,
    });

    return NextResponse.json({
      cents: quote.cents,
      free: quote.free,
      label: quote.label,
      region: quote.region,
      regionLabel: quote.regionLabel,
      etaDaysMin: quote.etaDaysMin,
      etaDaysMax: quote.etaDaysMax,
    });
  } catch (error) {
    const message =
      error instanceof ShippingQuoteError
        ? error.message
        : 'Não foi possível calcular o frete.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
