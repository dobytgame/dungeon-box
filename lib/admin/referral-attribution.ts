import type { SupabaseClient } from '@supabase/supabase-js';
import { REFERRAL_STATUS_LABELS } from '@/lib/referral/constants';
import type {
  AdminCustomerReferralAttribution,
  AdminPartnerReferralStats,
  AdminReferrerLeaderboardRow,
} from '@/lib/admin/types';

type ReferralRow = {
  referred_id: string;
  referrer_id: string;
  status: string;
  created_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
};

type CodeRow = {
  user_id: string;
  code: string;
  total_referrals: number | null;
  total_conversions: number | null;
  total_visits: number | null;
};

function profileLabel(profile: ProfileRow | undefined): string | null {
  if (!profile) return null;
  return profile.full_name ?? profile.display_name ?? profile.email ?? null;
}

export function referralStatusLabel(status: string): string {
  return REFERRAL_STATUS_LABELS[status] ?? status;
}

export async function loadReferralAttributionByReferredIds(
  admin: SupabaseClient,
  referredIds: string[]
): Promise<Map<string, AdminCustomerReferralAttribution>> {
  const result = new Map<string, AdminCustomerReferralAttribution>();
  if (referredIds.length === 0) return result;

  const { data: referrals } = await admin
    .from('referrals')
    .select('referred_id, referrer_id, status, created_at')
    .in('referred_id', referredIds);

  if (!referrals?.length) return result;

  const referrerIds = Array.from(
    new Set(referrals.map((row) => row.referrer_id))
  );

  const [{ data: profiles }, { data: codes }] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name, display_name, email')
      .in('id', referrerIds),
    admin
      .from('referral_codes')
      .select('user_id, code')
      .in('user_id', referrerIds),
  ]);

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile as ProfileRow])
  );
  const codeByUserId = new Map(
    (codes ?? []).map((row) => [row.user_id, row.code as string])
  );

  for (const referral of referrals as ReferralRow[]) {
    const referrer = profileById.get(referral.referrer_id);
    result.set(referral.referred_id, {
      referrerId: referral.referrer_id,
      referrerName: profileLabel(referrer),
      referrerEmail: referrer?.email ?? null,
      referralCode: codeByUserId.get(referral.referrer_id) ?? null,
      status: referral.status,
      createdAt: referral.created_at,
    });
  }

  return result;
}

export async function getAdminPartnerReferralStats(
  admin: SupabaseClient
): Promise<AdminPartnerReferralStats> {
  const [
    { count: totalAttributed },
    { count: qualifiedCustomers },
    { count: pendingCustomers },
    { data: referrals },
    { data: codes },
  ] = await Promise.all([
    admin.from('referrals').select('id', { count: 'exact', head: true }),
    admin
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'qualified'),
    admin
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin.from('referrals').select('referrer_id, status'),
    admin
      .from('referral_codes')
      .select('user_id, code, total_referrals, total_conversions, total_visits')
      .order('total_referrals', { ascending: false })
      .limit(50),
  ]);

  const countsByReferrer = new Map<
    string,
    { total: number; pending: number; qualified: number }
  >();

  for (const row of referrals ?? []) {
    const current = countsByReferrer.get(row.referrer_id) ?? {
      total: 0,
      pending: 0,
      qualified: 0,
    };
    current.total += 1;
    if (row.status === 'pending') current.pending += 1;
    if (row.status === 'qualified') current.qualified += 1;
    countsByReferrer.set(row.referrer_id, current);
  }

  const referrerIds = Array.from(
    new Set([
      ...(codes ?? []).map((row) => row.user_id),
      ...Array.from(countsByReferrer.keys()),
    ])
  );

  const { data: profiles } = referrerIds.length
    ? await admin
        .from('profiles')
        .select('id, full_name, display_name, email')
        .in('id', referrerIds)
    : { data: [] as ProfileRow[] };

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile as ProfileRow])
  );
  const codeByUserId = new Map(
    (codes ?? []).map((row) => [row.user_id, row as CodeRow])
  );

  const totalLinkVisits = (codes ?? []).reduce(
    (sum, row) => sum + (row.total_visits ?? 0),
    0
  );

  const topReferrers: AdminReferrerLeaderboardRow[] = referrerIds
    .map((userId) => {
      const live = countsByReferrer.get(userId);
      const codeRow = codeByUserId.get(userId);
      const profile = profileById.get(userId);
      const totalReferrals = live?.total ?? codeRow?.total_referrals ?? 0;
      const totalVisits = codeRow?.total_visits ?? 0;

      if (totalReferrals <= 0 && totalVisits <= 0) return null;

      return {
        userId,
        name: profileLabel(profile),
        email: profile?.email ?? null,
        code: codeRow?.code ?? '—',
        totalVisits,
        totalReferrals,
        totalConversions:
          live?.qualified ?? codeRow?.total_conversions ?? 0,
        pendingCount: live?.pending ?? 0,
        qualifiedCount: live?.qualified ?? 0,
      };
    })
    .filter((row): row is AdminReferrerLeaderboardRow => row !== null)
    .sort((a, b) => b.totalReferrals - a.totalReferrals || b.totalVisits - a.totalVisits)
    .slice(0, 12);

  return {
    totalAttributedCustomers: totalAttributed ?? 0,
    qualifiedCustomers: qualifiedCustomers ?? 0,
    pendingCustomers: pendingCustomers ?? 0,
    totalLinkVisits,
    activeReferrers: countsByReferrer.size,
    topReferrers,
  };
}
