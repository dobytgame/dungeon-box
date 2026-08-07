import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeEmailAddress } from '@/lib/email/unsubscribe';

export type EmailSuppressionReason =
  | 'unsubscribe'
  | 'complaint'
  | 'hard_bounce'
  | 'manual';

export async function isEmailSuppressed(
  supabase: SupabaseClient,
  email: string
): Promise<boolean> {
  const normalized = normalizeEmailAddress(email);
  if (!normalized) return false;

  const { data, error } = await supabase
    .from('email_suppressions')
    .select('id')
    .eq('email', normalized)
    .maybeSingle();

  if (error) {
    console.error('[email] isEmailSuppressed:', error.message);
    return false;
  }

  return Boolean(data);
}

export async function fetchSuppressedEmails(
  supabase: SupabaseClient,
  emails: string[]
): Promise<Set<string>> {
  const normalized = Array.from(
    new Set(emails.map(normalizeEmailAddress).filter(Boolean))
  );
  if (normalized.length === 0) return new Set();

  const suppressed = new Set<string>();
  const chunkSize = 200;

  for (let i = 0; i < normalized.length; i += chunkSize) {
    const chunk = normalized.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('email_suppressions')
      .select('email')
      .in('email', chunk);

    if (error) {
      console.error('[email] fetchSuppressedEmails:', error.message);
      continue;
    }

    for (const row of data ?? []) {
      if (row.email) suppressed.add(normalizeEmailAddress(row.email));
    }
  }

  return suppressed;
}

export async function suppressEmail(
  supabase: SupabaseClient,
  input: {
    email: string;
    reason: EmailSuppressionReason;
    source?: string;
    resendEmailId?: string | null;
  }
): Promise<{ ok: true } | { error: string }> {
  const email = normalizeEmailAddress(input.email);
  if (!email || !email.includes('@')) {
    return { error: 'E-mail inválido.' };
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from('email_suppressions').upsert(
    {
      email,
      reason: input.reason,
      source: input.source ?? null,
      resend_email_id: input.resendEmailId ?? null,
      updated_at: now,
    },
    { onConflict: 'email' }
  );

  if (error) {
    // Fallback se o índice unique for em lower(email) e o upsert por email falhar.
    const { data: existing } = await supabase
      .from('email_suppressions')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('email_suppressions')
        .update({
          reason: input.reason,
          source: input.source ?? null,
          resend_email_id: input.resendEmailId ?? null,
          updated_at: now,
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('[email] suppressEmail update:', updateError.message);
        return { error: updateError.message };
      }
      return { ok: true };
    }

    console.error('[email] suppressEmail:', error.message);
    return { error: error.message };
  }

  if (input.reason === 'unsubscribe' || input.reason === 'complaint') {
    await supabase
      .from('profiles')
      .update({ newsletter: false })
      .ilike('email', email);
  }

  return { ok: true };
}
