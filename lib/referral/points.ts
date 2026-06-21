import type { SupabaseClient } from '@supabase/supabase-js';
import {
  REFERRAL_BASE_POINTS,
  REFERRAL_BONUS_FROM_NTH,
  REFERRAL_BONUS_POINTS,
  REFERRAL_MONTHLY_CREDIT_LIMIT,
  REFERRAL_POINTS_VALIDITY_MONTHS,
} from '@/lib/referral/constants';

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function calculateReferralPoints(monthlyQualifiedCount: number): number {
  const nextIndex = monthlyQualifiedCount + 1;
  if (nextIndex > REFERRAL_MONTHLY_CREDIT_LIMIT) return 0;
  const bonus =
    nextIndex >= REFERRAL_BONUS_FROM_NTH ? REFERRAL_BONUS_POINTS : 0;
  return REFERRAL_BASE_POINTS + bonus;
}

export async function getPointsBalance(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await supabase
    .from('points_ledger')
    .select('amount, type, expired')
    .eq('user_id', userId);

  if (!data?.length) return 0;

  return data.reduce((sum, row) => {
    if (row.type === 'credit' && row.expired) return sum;
    return sum + row.amount;
  }, 0);
}

export async function getExpiringSoonPoints(
  supabase: SupabaseClient,
  userId: string,
  withinDays = 30
): Promise<number> {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + withinDays);

  const { data } = await supabase
    .from('points_ledger')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'credit')
    .eq('expired', false)
    .not('expires_at', 'is', null)
    .lte('expires_at', deadline.toISOString());

  return (data ?? []).reduce((sum, row) => sum + row.amount, 0);
}

export async function countMonthlyQualifiedReferrals(
  supabase: SupabaseClient,
  referrerId: string,
  referenceDate = new Date()
): Promise<number> {
  const monthStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1
  );
  const monthEnd = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    1
  );

  const { count } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', referrerId)
    .eq('points_credited', true)
    .gte('qualified_at', monthStart.toISOString())
    .lt('qualified_at', monthEnd.toISOString());

  return count ?? 0;
}

export async function creditReferralPoints(
  supabase: SupabaseClient,
  input: {
    userId: string;
    referralId: string;
    amount: number;
    description: string;
  }
): Promise<void> {
  const expiresAt = addMonths(new Date(), REFERRAL_POINTS_VALIDITY_MONTHS);

  const { error } = await supabase.from('points_ledger').insert({
    user_id: input.userId,
    referral_id: input.referralId,
    amount: input.amount,
    type: 'credit',
    description: input.description,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(`Falha ao creditar pontos: ${error.message}`);
  }
}

/** Debita pontos (saldo validado; expiração segue ordem FIFO nos créditos). */
export async function debitPointsFifo(
  supabase: SupabaseClient,
  input: {
    userId: string;
    amount: number;
    description: string;
    redemptionId: string;
  }
): Promise<void> {
  const balance = await getPointsBalance(supabase, input.userId);
  if (balance < input.amount) {
    throw new Error('Saldo insuficiente de pontos.');
  }

  const { error } = await supabase.from('points_ledger').insert({
    user_id: input.userId,
    redemption_id: input.redemptionId,
    amount: -input.amount,
    type: 'debit',
    description: input.description,
  });

  if (error) {
    throw new Error(`Falha ao debitar pontos: ${error.message}`);
  }
}

export async function refundRedemptionPoints(
  supabase: SupabaseClient,
  input: {
    userId: string;
    amount: number;
    description: string;
    redemptionId: string;
  }
): Promise<void> {
  const expiresAt = addMonths(new Date(), REFERRAL_POINTS_VALIDITY_MONTHS);

  await supabase.from('points_ledger').insert({
    user_id: input.userId,
    redemption_id: input.redemptionId,
    amount: input.amount,
    type: 'credit',
    description: input.description,
    expires_at: expiresAt.toISOString(),
  });
}

export async function expireDuePoints(
  supabase: SupabaseClient,
  asOf = new Date()
): Promise<number> {
  const { data: dueCredits } = await supabase
    .from('points_ledger')
    .select('id, user_id, amount')
    .eq('type', 'credit')
    .eq('expired', false)
    .not('expires_at', 'is', null)
    .lte('expires_at', asOf.toISOString());

  if (!dueCredits?.length) return 0;

  let expiredCount = 0;

  for (const credit of dueCredits) {
    const balance = await getPointsBalance(supabase, credit.user_id);
    const toExpire = Math.min(credit.amount, Math.max(balance, 0));
    if (toExpire <= 0) {
      await supabase
        .from('points_ledger')
        .update({ expired: true })
        .eq('id', credit.id);
      expiredCount += 1;
      continue;
    }

    await supabase.from('points_ledger').insert({
      user_id: credit.user_id,
      amount: -toExpire,
      type: 'expiry',
      description: 'Pontos expirados',
    });

    await supabase
      .from('points_ledger')
      .update({ expired: true })
      .eq('id', credit.id);

    expiredCount += 1;
  }

  return expiredCount;
}

export async function findPointsExpiringForWarning(
  supabase: SupabaseClient,
  withinDays = 30
): Promise<
  Array<{ userId: string; points: number; expiresAt: string }>
> {
  const now = new Date();
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + withinDays);

  const { data } = await supabase
    .from('points_ledger')
    .select('user_id, amount, expires_at')
    .eq('type', 'credit')
    .eq('expired', false)
    .not('expires_at', 'is', null)
    .gte('expires_at', now.toISOString())
    .lte('expires_at', deadline.toISOString());

  const grouped = new Map<string, { points: number; expiresAt: string }>();

  for (const row of data ?? []) {
    if (!row.expires_at) continue;
    const current = grouped.get(row.user_id);
    if (!current) {
      grouped.set(row.user_id, {
        points: row.amount,
        expiresAt: row.expires_at,
      });
    } else {
      current.points += row.amount;
      if (row.expires_at < current.expiresAt) {
        current.expiresAt = row.expires_at;
      }
    }
  }

  return Array.from(grouped.entries()).map(([userId, value]) => ({
    userId,
    ...value,
  }));
}
