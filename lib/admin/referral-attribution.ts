import type { SupabaseClient } from '@supabase/supabase-js';
import { REFERRAL_STATUS_LABELS } from '@/lib/referral/constants';
import { loadReferralSignupByReferredIds } from '@/lib/referral/signups';
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

  const [{ data: referrals }, signupByReferred] = await Promise.all([
    admin
      .from('referrals')
      .select('referred_id, referrer_id, status, created_at')
      .in('referred_id', referredIds),
    loadReferralSignupByReferredIds(admin, referredIds),
  ]);

  const referrerIds = new Set<string>();
  for (const referral of referrals ?? []) {
    referrerIds.add(referral.referrer_id as string);
  }
  Array.from(signupByReferred.values()).forEach((signup) => {
    referrerIds.add(signup.referrerId);
  });

  const [{ data: profiles }, { data: codes }] = await Promise.all([
    referrerIds.size
      ? admin
          .from('profiles')
          .select('id, full_name, display_name, email')
          .in('id', Array.from(referrerIds))
      : Promise.resolve({ data: [] as ProfileRow[] }),
    referrerIds.size
      ? admin
          .from('referral_codes')
          .select('user_id, code')
          .in('user_id', Array.from(referrerIds))
      : Promise.resolve({ data: [] as { user_id: string; code: string }[] }),
  ]);

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile as ProfileRow])
  );
  const codeByUserId = new Map(
    (codes ?? []).map((row) => [row.user_id, row.code as string])
  );

  for (const referral of (referrals ?? []) as ReferralRow[]) {
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

  Array.from(signupByReferred.entries()).forEach(([referredId, signup]) => {
    if (result.has(referredId)) return;

    const referrer = profileById.get(signup.referrerId);
    result.set(referredId, {
      referrerId: signup.referrerId,
      referrerName: profileLabel(referrer),
      referrerEmail: referrer?.email ?? null,
      referralCode: signup.referralCode,
      status: 'signed_up',
      createdAt: signup.createdAt,
    });
  });

  return result;
}

export async function getAdminPartnerReferralStats(
  admin: SupabaseClient
): Promise<AdminPartnerReferralStats> {
  const [
    { count: totalSignups },
    { count: totalAttributed },
    { count: qualifiedCustomers },
    { count: pendingCustomers },
    { data: referrals },
    { data: signups },
    { data: codes },
  ] = await Promise.all([
    admin.from('referral_signups').select('id', { count: 'exact', head: true }),
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
    admin.from('referral_signups').select('referrer_id'),
    admin
      .from('referral_codes')
      .select('user_id, code, total_referrals, total_conversions, total_visits')
      .order('total_referrals', { ascending: false })
      .limit(50),
  ]);

  const countsByReferrer = new Map<
    string,
    { signups: number; total: number; pending: number; qualified: number }
  >();

  for (const row of signups ?? []) {
    const current = countsByReferrer.get(row.referrer_id) ?? {
      signups: 0,
      total: 0,
      pending: 0,
      qualified: 0,
    };
    current.signups += 1;
    countsByReferrer.set(row.referrer_id, current);
  }

  for (const row of referrals ?? []) {
    const current = countsByReferrer.get(row.referrer_id) ?? {
      signups: 0,
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
      const totalSignupCount = live?.signups ?? 0;

      if (totalReferrals <= 0 && totalVisits <= 0 && totalSignupCount <= 0) {
        return null;
      }

      return {
        userId,
        name: profileLabel(profile),
        email: profile?.email ?? null,
        code: codeRow?.code ?? '—',
        totalVisits,
        totalSignups: totalSignupCount,
        totalReferrals,
        totalConversions:
          live?.qualified ?? codeRow?.total_conversions ?? 0,
        pendingCount: live?.pending ?? 0,
        qualifiedCount: live?.qualified ?? 0,
      };
    })
    .filter((row): row is AdminReferrerLeaderboardRow => row !== null)
    .sort(
      (a, b) =>
        b.totalSignups - a.totalSignups ||
        b.totalReferrals - a.totalReferrals ||
        b.totalVisits - a.totalVisits
    )
    .slice(0, 12);

  const activeReferrers = Array.from(countsByReferrer.values()).filter(
    (row) => row.signups > 0 || row.total > 0
  ).length;

  return {
    totalLinkVisits,
    totalSignups: totalSignups ?? 0,
    totalAttributedCustomers: totalAttributed ?? 0,
    qualifiedCustomers: qualifiedCustomers ?? 0,
    pendingCustomers: pendingCustomers ?? 0,
    activeReferrers,
    topReferrers,
  };
}
