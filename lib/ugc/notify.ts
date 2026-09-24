import type { SupabaseClient } from '@supabase/supabase-js';
import {
  sendUgcApprovedEmail,
  sendUgcReceivedEmail,
  sendUgcRejectedEmail,
} from '@/lib/email/send-transactional';

async function loadRecipient(
  admin: SupabaseClient,
  userId: string
): Promise<{ email: string; name: string | null } | null> {
  const { data, error } = await admin
    .from('profiles')
    .select('email, full_name, display_name')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[ugc] loadRecipient:', error.message);
    return null;
  }

  if (!data) return null;
  const email = (data.email as string | null)?.trim();
  if (!email) return null;

  return {
    email,
    name: (data.display_name as string | null) ?? (data.full_name as string | null),
  };
}

export async function notifyUgcReceived(admin: SupabaseClient, userId: string): Promise<void> {
  const recipient = await loadRecipient(admin, userId);
  if (!recipient) return;
  const result = await sendUgcReceivedEmail({ to: recipient.email, name: recipient.name });
  if (!result.sent) {
    console.error('[ugc] notifyUgcReceived:', result.message ?? result.reason);
  }
}

export async function notifyUgcApproved(
  admin: SupabaseClient,
  userId: string,
  cycleNumber?: number | null
): Promise<void> {
  const recipient = await loadRecipient(admin, userId);
  if (!recipient) return;
  const result = await sendUgcApprovedEmail({
    to: recipient.email,
    name: recipient.name,
    cycleNumber,
  });
  if (!result.sent) {
    console.error('[ugc] notifyUgcApproved:', result.message ?? result.reason);
  }
}

export async function notifyUgcRejected(admin: SupabaseClient, userId: string): Promise<void> {
  const recipient = await loadRecipient(admin, userId);
  if (!recipient) return;
  const result = await sendUgcRejectedEmail({ to: recipient.email, name: recipient.name });
  if (!result.sent) {
    console.error('[ugc] notifyUgcRejected:', result.message ?? result.reason);
  }
}
