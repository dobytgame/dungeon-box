import type { SupabaseClient } from '@supabase/supabase-js';
import { relOne } from '@/lib/dashboard/format';
import type { MarketingAudience, MarketingRecipient } from '@/lib/admin/types';

const PAGE_SIZE = 1000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function profileName(profile: {
  full_name?: string | null;
  display_name?: string | null;
}): string | null {
  return profile.full_name?.trim() || profile.display_name?.trim() || null;
}

async function fetchProfileRecipients(admin: SupabaseClient): Promise<MarketingRecipient[]> {
  const byEmail = new Map<string, MarketingRecipient>();
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from('profiles')
      .select('email, full_name, display_name')
      .not('email', 'is', null)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      if (!row.email) continue;
      const email = normalizeEmail(row.email);
      byEmail.set(email, {
        email,
        name: profileName(row),
      });
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return Array.from(byEmail.values());
}

async function fetchActiveSubscriberEmails(admin: SupabaseClient): Promise<string[]> {
  const recipients = await fetchActiveSubscriberRecipients(admin);
  return recipients.map((row) => row.email);
}

async function fetchActiveSubscriberRecipients(
  admin: SupabaseClient
): Promise<MarketingRecipient[]> {
  const byEmail = new Map<string, MarketingRecipient>();
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from('subscriptions')
      .select('profiles(email, full_name, display_name)')
      .eq('status', 'active')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      const profile = relOne(
        row.profiles as
          | { email?: string | null; full_name?: string | null; display_name?: string | null }
          | null
      );
      if (!profile?.email) continue;
      const email = normalizeEmail(profile.email);
      byEmail.set(email, {
        email,
        name: profileName(profile),
      });
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return Array.from(byEmail.values());
}

async function fetchNewsletterRecipients(admin: SupabaseClient): Promise<MarketingRecipient[]> {
  const byEmail = new Map<string, MarketingRecipient>();
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from('newsletter_leads')
      .select('email')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      if (!row.email) continue;
      const email = normalizeEmail(row.email);
      byEmail.set(email, {
        email,
        name: null,
      });
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return Array.from(byEmail.values());
}

function normalizeAdminProfile(
  value?: string | { email?: string | null; full_name?: string | null; display_name?: string | null } | null
): { email?: string | null; full_name?: string | null; display_name?: string | null } | null {
  if (!value) return null;
  if (typeof value === 'string') {
    return { email: value, full_name: null, display_name: null };
  }
  return value;
}

export async function resolveMarketingAudienceEmails(
  admin: SupabaseClient,
  audience: MarketingAudience,
  adminProfile?: string | { email?: string | null; full_name?: string | null; display_name?: string | null } | null
): Promise<string[]> {
  const recipients = await resolveMarketingAudienceRecipients(
    admin,
    audience,
    normalizeAdminProfile(adminProfile)
  );
  return recipients.map((row) => row.email);
}

export async function resolveMarketingAudienceRecipients(
  admin: SupabaseClient,
  audience: MarketingAudience,
  adminProfile?: { email?: string | null; full_name?: string | null; display_name?: string | null } | null
): Promise<MarketingRecipient[]> {
  switch (audience) {
    case 'admin_test':
      return adminProfile?.email
        ? [
            {
              email: normalizeEmail(adminProfile.email),
              name: profileName(adminProfile),
            },
          ]
        : [];
    case 'active_subscribers':
      return fetchActiveSubscriberRecipients(admin);
    case 'newsletter_leads':
      return fetchNewsletterRecipients(admin);
    case 'inactive_users': {
      const [allProfiles, active] = await Promise.all([
        fetchProfileRecipients(admin),
        fetchActiveSubscriberRecipients(admin),
      ]);
      const activeSet = new Set(active.map((row) => row.email));
      return allProfiles.filter((row) => !activeSet.has(row.email));
    }
    case 'all_profiles':
    default:
      return fetchProfileRecipients(admin);
  }
}

export const MARKETING_AUDIENCE_LABELS: Record<MarketingAudience, string> = {
  all_profiles: 'Todos os usuários cadastrados',
  active_subscribers: 'Assinantes com plano ativo',
  inactive_users: 'Usuários sem plano ativo',
  newsletter_leads: 'Leads da newsletter (landing)',
  admin_test: 'Teste — apenas meu e-mail',
};
