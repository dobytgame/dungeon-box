import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSiteUrl } from '@/lib/email/config';
import { sendPasswordResetEmail } from '@/lib/email/send-transactional';
import { greetingName } from '@/lib/email/layout';
import { createAdminClient } from '@/lib/supabase/admin';

const bodySchema = z.object({
  email: z.string().email().max(320),
});

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const siteUrl = getSiteUrl();
  const redirectTo = `${siteUrl}/auth/callback?next=/dashboard`;

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, display_name')
    .eq('email', email)
    .maybeSingle();

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  });

  if (error) {
    console.error('[auth] generateLink recovery failed:', error);
    // Resposta genérica para não revelar se o e-mail existe
    return NextResponse.json({
      success: true,
      message: 'Se o e-mail estiver cadastrado, você receberá o link em instantes.',
    });
  }

  const resetUrl = data.properties?.action_link;
  if (resetUrl) {
    const emailResult = await sendPasswordResetEmail({
      to: email,
      name: greetingName(profile?.display_name ?? profile?.full_name),
      resetUrl,
    });

    if (!emailResult.sent) {
      console.warn('[auth] password reset email failed:', emailResult);
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Se o e-mail estiver cadastrado, você receberá o link em instantes.',
  });
}
