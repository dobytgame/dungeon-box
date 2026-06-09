import { getSiteUrl } from '@/lib/email/config';
import { sendPasswordResetEmail } from '@/lib/email/send-transactional';
import { greetingName } from '@/lib/email/layout';
import { createAdminClient } from '@/lib/supabase/admin';

const RESET_NEXT_PATH = '/auth/nova-senha';

export type RequestPasswordResetResult = {
  success: true;
  message: string;
  emailSent: boolean;
};

/**
 * Gera link de recuperação no Supabase e envia e-mail branded via Resend.
 * O link redireciona para /auth/nova-senha após validação.
 */
export async function requestPasswordReset(
  email: string,
): Promise<RequestPasswordResetResult> {
  const normalized = email.trim().toLowerCase();
  const siteUrl = getSiteUrl();
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(RESET_NEXT_PATH)}`;

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, display_name')
    .eq('email', normalized)
    .maybeSingle();

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: normalized,
    options: { redirectTo },
  });

  if (error) {
    console.error('[auth] generateLink recovery failed:', error);
    return {
      success: true,
      message:
        'Se o e-mail estiver cadastrado, você receberá o link em instantes.',
      emailSent: false,
    };
  }

  const resetUrl = data.properties?.action_link;
  let emailSent = false;

  if (resetUrl) {
    const emailResult = await sendPasswordResetEmail({
      to: normalized,
      name: greetingName(profile?.display_name ?? profile?.full_name),
      resetUrl,
    });
    emailSent = emailResult.sent;
    if (!emailResult.sent) {
      console.warn('[auth] password reset email failed:', emailResult);
    }
  }

  return {
    success: true,
    message:
      'Se o e-mail estiver cadastrado, você receberá o link em instantes.',
    emailSent,
  };
}

export const PASSWORD_RESET_LANDING_PATH = RESET_NEXT_PATH;
