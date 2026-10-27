import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PLAN_SLUGS, type PlanSlug } from '@/lib/checkout/plans';
import { plans as catalogPlans } from '@/lib/data';
import { digitsOnly } from '@/lib/masks';
import { PRODUCTION_LEAD_BUSINESS_DAYS } from '@/lib/production/lead-time';
import { quoteShipping, ShippingQuoteError } from '@/lib/shipping/quote';
import type { PlanFreightRules } from '@/lib/shipping/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAddressByCep } from '@/lib/viacep';

const bodySchema = z.object({
  planSlug: z.enum(PLAN_SLUGS),
  zipCode: z.string().min(8).max(12),
});

const DEFAULT_FREIGHT: PlanFreightRules = {
  freight_free: false,
  freight_regions: null,
};

async function loadPlanFreightRules(planSlug: PlanSlug): Promise<{
  freight: PlanFreightRules;
  priceCents: number | null;
}> {
  const catalog = catalogPlans.find((plan) => plan.id === planSlug);
  const fallbackCents = catalog ? catalog.price * 100 : null;

  try {
    const admin = createAdminClient();
    const { data: plan } = await admin
      .from('plans')
      .select('freight_free, freight_regions, price_cents')
      .eq('slug', planSlug)
      .eq('is_active', true)
      .maybeSingle();

    if (!plan) {
      return { freight: DEFAULT_FREIGHT, priceCents: fallbackCents };
    }

    return {
      freight: {
        freight_free: Boolean(plan.freight_free),
        freight_regions: (plan.freight_regions as string[] | null) ?? null,
      },
      priceCents:
        typeof plan.price_cents === 'number' ? plan.price_cents : fallbackCents,
    };
  } catch (error) {
    console.error('[shipping] estimate plan load:', error);
    return { freight: DEFAULT_FREIGHT, priceCents: fallbackCents };
  }
}

/** Cotação pública por CEP + plano (sem auth). Mesma tabela usada no checkout. */
export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const zipDigits = digitsOnly(body.zipCode);
  if (zipDigits.length !== 8) {
    return NextResponse.json({ error: 'CEP inválido.' }, { status: 400 });
  }

  const address = await fetchAddressByCep(zipDigits);
  if (!address?.state) {
    return NextResponse.json({ error: 'CEP não encontrado.' }, { status: 400 });
  }

  const { freight, priceCents } = await loadPlanFreightRules(body.planSlug);

  try {
    const quote = quoteShipping(freight, {
      zip_code: zipDigits,
      state: address.state,
    });

    const productCents = priceCents ?? 0;
    const shippingCents = quote.free ? 0 : quote.cents;

    return NextResponse.json({
      planSlug: body.planSlug,
      city: address.city,
      state: address.state,
      regionLabel: quote.regionLabel,
      shippingCents,
      shippingFree: quote.free,
      shippingLabel: quote.label,
      etaDaysMin: quote.etaDaysMin,
      etaDaysMax: quote.etaDaysMax,
      productCents,
      totalCents: productCents + shippingCents,
      productionLeadBusinessDays: PRODUCTION_LEAD_BUSINESS_DAYS,
    });
  } catch (error) {
    if (error instanceof ShippingQuoteError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[shipping] estimate:', error);
    return NextResponse.json(
      { error: 'Não conseguimos calcular o frete agora. Tente novamente ou fale com a equipe.' },
      { status: 500 }
    );
  }
}
