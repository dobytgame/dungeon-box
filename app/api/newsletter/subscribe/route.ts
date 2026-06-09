import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const bodySchema = z.object({
  email: z.string().email().max(320),
  source: z.string().max(64).optional().default('launch_lp'),
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
      { error: 'Newsletter indisponível no momento.' },
      { status: 503 }
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    body = bodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from('newsletter_leads')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      success: true,
      alreadySubscribed: true,
      message: 'Você já está na lista. Obrigado!',
    });
  }

  const { error } = await supabase.from('newsletter_leads').insert({
    email,
    source: body.source,
    updated_at: now,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({
        success: true,
        alreadySubscribed: true,
        message: 'Você já está na lista. Obrigado!',
      });
    }
    console.error('[newsletter] insert failed:', error);
    return NextResponse.json(
      { error: 'Não foi possível salvar seu e-mail. Tente novamente.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    alreadySubscribed: false,
    message: 'Pronto! Você entrou na Crônica do Mestre.',
  });
}
