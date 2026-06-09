import { sendPasswordResetEmail } from '@/lib/email/send-transactional';
import { greetingName } from '@/lib/email/layout';
import { PASSWORD_RESET_PATH } from '@/lib/auth/recovery-session';
import { resolveAuthRedirectOrigin } from '@/lib/auth/redirect-origin';
import { createAdminClient } from '@/lib/supabase/admin';

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
  requestOrigin?: string,
): Promise<RequestPasswordResetResult> {
  const normalized = email.trim().toLowerCase();
  const origin = resolveAuthRedirectOrigin(requestOrigin);
  const redirectTo = `${origin}${PASSWORD_RESET_PATH}`;

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

export const PASSWORD_RESET_LANDING_PATH = PASSWORD_RESET_PATH;
