import type { SupabaseClient } from '@supabase/supabase-js';
import { relOne } from '@/lib/dashboard/format';
import type { MarketingAudience } from '@/lib/admin/types';

const PAGE_SIZE = 1000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function fetchProfileEmails(admin: SupabaseClient): Promise<string[]> {
  const emails = new Set<string>();
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from('profiles')
      .select('email')
      .not('email', 'is', null)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      if (row.email) emails.add(normalizeEmail(row.email));
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return Array.from(emails);
}

async function fetchActiveSubscriberEmails(admin: SupabaseClient): Promise<string[]> {
  const emails = new Set<string>();
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from('subscriptions')
      .select('profiles(email)')
      .eq('status', 'active')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      const profile = relOne(row.profiles as { email?: string | null } | null);
      if (profile?.email) emails.add(normalizeEmail(profile.email));
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return Array.from(emails);
}

async function fetchNewsletterEmails(admin: SupabaseClient): Promise<string[]> {
  const emails = new Set<string>();
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
      if (row.email) emails.add(normalizeEmail(row.email));
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return Array.from(emails);
}

export async function resolveMarketingAudienceEmails(
  admin: SupabaseClient,
  audience: MarketingAudience,
  adminEmail?: string | null
): Promise<string[]> {
  switch (audience) {
    case 'admin_test':
      return adminEmail ? [normalizeEmail(adminEmail)] : [];
    case 'active_subscribers':
      return fetchActiveSubscriberEmails(admin);
    case 'newsletter_leads':
      return fetchNewsletterEmails(admin);
    case 'inactive_users': {
      const [allProfiles, active] = await Promise.all([
        fetchProfileEmails(admin),
        fetchActiveSubscriberEmails(admin),
      ]);
      const activeSet = new Set(active);
      return allProfiles.filter((email) => !activeSet.has(email));
    }
    case 'all_profiles':
    default:
      return fetchProfileEmails(admin);
  }
}

export const MARKETING_AUDIENCE_LABELS: Record<MarketingAudience, string> = {
  all_profiles: 'Todos os usuários cadastrados',
  active_subscribers: 'Assinantes com plano ativo',
  inactive_users: 'Usuários sem plano ativo',
  newsletter_leads: 'Leads da newsletter (landing)',
  admin_test: 'Teste — apenas meu e-mail',
};
