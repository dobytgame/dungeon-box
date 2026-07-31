import { NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeBrazilPhoneE164 } from '@/lib/whatsapp/phone';
import { createAdminClient } from '@/lib/supabase/admin';

const bodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(10).max(20),
  source: z.string().trim().max(64).optional().default('floating_widget'),
  pagePath: z.string().trim().max(512).optional().nullable(),
  pageUrl: z.string().trim().url().max(2048).optional().nullable(),
  utmSource: z.string().trim().max(128).optional().nullable(),
  utmMedium: z.string().trim().max(128).optional().nullable(),
  utmCampaign: z.string().trim().max(128).optional().nullable(),
  utmContent: z.string().trim().max(128).optional().nullable(),
  utmTerm: z.string().trim().max(128).optional().nullable(),
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { error: 'Captura de lead indisponível no momento.' },
      { status: 503 }
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    body = bodySchema.parse(json);
  } catch {
    return NextResponse.json(
      { error: 'Preencha nome, e-mail e WhatsApp válidos.' },
      { status: 400 }
    );
  }

  const phoneE164 = normalizeBrazilPhoneE164(body.phone);
  if (!phoneE164) {
    return NextResponse.json(
      { error: 'Informe um WhatsApp válido com DDD.' },
      { status: 400 }
    );
  }

  const email = normalizeEmail(body.email);
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from('whatsapp_leads').insert({
    name: body.name.trim(),
    email,
    phone_e164: phoneE164,
    source: body.source,
    page_path: body.pagePath ?? null,
    page_url: body.pageUrl ?? null,
    utm_source: body.utmSource ?? null,
    utm_medium: body.utmMedium ?? null,
    utm_campaign: body.utmCampaign ?? null,
    utm_content: body.utmContent ?? null,
    utm_term: body.utmTerm ?? null,
    updated_at: now,
  });

  if (error) {
    console.error('[whatsapp-lead] insert failed:', error);
    return NextResponse.json(
      { error: 'Não foi possível salvar seus dados. Tente novamente.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
