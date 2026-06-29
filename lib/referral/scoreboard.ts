import type { SupabaseClient } from '@supabase/supabase-js';
import { rankProgress } from '@/lib/referral/ranks';
import { getPointsBalance } from '@/lib/referral/points';

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  conversions: number;
  isCurrentUser: boolean;
};

export type PointsActivity = {
  id: string;
  amount: number;
  type: 'credit' | 'debit' | 'expiry';
  description: string;
  createdAt: string;
};

export type ScoreboardStats = {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  totalVisits: number;
  totalReferrals: number;
  totalConversions: number;
  pendingReferrals: number;
  monthlyQualified: number;
  rank: ReturnType<typeof rankProgress>;
  leaderboard: LeaderboardEntry[];
  userLeaderboardRank: number | null;
  activity: PointsActivity[];
};

function maskDisplayName(
  profile: {
    display_name?: string | null;
    full_name?: string | null;
    email?: string | null;
  } | null,
  userId: string
): string {
  const raw =
    profile?.display_name ||
    profile?.full_name ||
    profile?.email?.split('@')[0] ||
    'Aventureiro';
  const first = raw.trim().split(/\s+/)[0] ?? 'Aventureiro';
  if (first.length <= 2) return `${first}***`;
  return `${first.charAt(0).toUpperCase()}${first.slice(1, 3).toLowerCase()}***`;
}

export async function getReferralScoreboard(
  supabase: SupabaseClient,
  userId: string
): Promise<ScoreboardStats> {
  const [
    balance,
    ledgerRes,
    lifetimeRes,
    codeRes,
    referralsRes,
    leaderboardRes,
  ] = await Promise.all([
    getPointsBalance(supabase, userId),
    supabase
      .from('points_ledger')
      .select('id, amount, type, description, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('points_ledger')
      .select('amount, type')
      .eq('user_id', userId),
    supabase
      .from('referral_codes')
      .select('total_referrals, total_conversions, total_visits')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('referrals')
      .select('status, qualified_at')
      .eq('referrer_id', userId),
    supabase
      .from('referral_codes')
      .select('user_id, total_conversions')
      .gt('total_conversions', 0)
      .order('total_conversions', { ascending: false })
      .limit(10),
  ]);

  const ledger = ledgerRes.data ?? [];
  const lifetimeRows = lifetimeRes.data ?? [];
  const referrals = referralsRes.data ?? [];

  let lifetimeEarned = 0;
  let lifetimeSpent = 0;
  for (const row of lifetimeRows) {
    if (row.type === 'credit' && row.amount > 0) lifetimeEarned += row.amount;
    if (row.type === 'debit') lifetimeSpent += Math.abs(row.amount);
  }

  const totalConversions = codeRes.data?.total_conversions ?? 0;
  const totalReferrals = codeRes.data?.total_referrals ?? referrals.length;
  const totalVisits = codeRes.data?.total_visits ?? 0;
  const pendingReferrals = referrals.filter((r) => r.status === 'pending').length;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthlyQualified = referrals.filter(
    (r) =>
      r.status === 'qualified' &&
      r.qualified_at &&
      new Date(r.qualified_at) >= monthStart
  ).length;

  const rank = rankProgress(totalConversions);

  const leaderboardRows = leaderboardRes.data ?? [];
  const profileIds = leaderboardRows.map((r) => r.user_id);
  const { data: profiles } = profileIds.length
    ? await supabase
        .from('profiles')
        .select('id, display_name, full_name, email')
        .in('id', profileIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const leaderboard: LeaderboardEntry[] = leaderboardRows.map((row, index) => ({
    rank: index + 1,
    userId: row.user_id,
    displayName: maskDisplayName(profileMap.get(row.user_id) ?? null, row.user_id),
    conversions: row.total_conversions ?? 0,
    isCurrentUser: row.user_id === userId,
  }));

  let userLeaderboardRank: number | null = null;
  if (totalConversions > 0) {
    const { count } = await supabase
      .from('referral_codes')
      .select('id', { count: 'exact', head: true })
      .gt('total_conversions', totalConversions);

    userLeaderboardRank = (count ?? 0) + 1;

    const inTop = leaderboard.some((e) => e.isCurrentUser);
    if (!inTop) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('display_name, full_name, email')
        .eq('id', userId)
        .maybeSingle();

      leaderboard.push({
        rank: userLeaderboardRank,
        userId,
        displayName:
          userProfile?.display_name ||
          userProfile?.full_name ||
          userProfile?.email?.split('@')[0] ||
          'Você',
        conversions: totalConversions,
        isCurrentUser: true,
      });
    }
  }

  const activity: PointsActivity[] = ledger.map((row) => ({
    id: row.id,
    amount: row.amount,
    type: row.type as PointsActivity['type'],
    description: row.description,
    createdAt: row.created_at,
  }));

  return {
    balance,
    lifetimeEarned,
    lifetimeSpent,
    totalVisits,
    totalReferrals,
    totalConversions,
    pendingReferrals,
    monthlyQualified,
    rank,
    leaderboard,
    userLeaderboardRank,
    activity,
  };
}
