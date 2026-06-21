import type { SupabaseClient } from '@supabase/supabase-js';
import {
  REFERRAL_REWARDS,
  type ReferralRewardType,
} from '@/lib/referral/constants';
import { userHasActiveReferralAccess } from '@/lib/referral/access';
import { debitPointsFifo, refundRedemptionPoints } from '@/lib/referral/points';

export type ShippingAddressPayload = {
  recipient: string;
  zip_code: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
};

function rewardLabel(type: ReferralRewardType): string {
  return REFERRAL_REWARDS.find((r) => r.type === type)?.label ?? type;
}

export async function createRedemption(
  supabase: SupabaseClient,
  input: {
    userId: string;
    rewardType: ReferralRewardType;
    shippingAddress: ShippingAddressPayload;
    notes?: string | null;
  }
): Promise<{ redemptionId: string }> {
  const hasAccess = await userHasActiveReferralAccess(supabase, input.userId);
  if (!hasAccess) {
    throw new Error(
      'Resgate disponível apenas para assinantes com assinatura ativa.'
    );
  }

  const reward = REFERRAL_REWARDS.find((r) => r.type === input.rewardType);
  if (!reward) {
    throw new Error('Recompensa inválida.');
  }

  const { data: redemption, error } = await supabase
    .from('redemptions')
    .insert({
      user_id: input.userId,
      reward_type: input.rewardType,
      points_spent: reward.points,
      status: 'pending',
      shipping_address: input.shippingAddress,
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single();

  if (error || !redemption) {
    throw new Error('Não foi possível criar o resgate.');
  }

  try {
    await debitPointsFifo(supabase, {
      userId: input.userId,
      amount: reward.points,
      description: `Resgate: ${reward.label}`,
      redemptionId: redemption.id,
    });
  } catch (debitError) {
    await supabase.from('redemptions').delete().eq('id', redemption.id);
    throw debitError;
  }

  return { redemptionId: redemption.id };
}

export async function cancelPendingRedemptionsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data: pending } = await supabase
    .from('redemptions')
    .select('id, points_spent, reward_type')
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (!pending?.length) return 0;

  for (const row of pending) {
    await supabase
      .from('redemptions')
      .update({ status: 'cancelled' })
      .eq('id', row.id);

    await refundRedemptionPoints(supabase, {
      userId,
      amount: row.points_spent,
      description: `Estorno: ${rewardLabel(row.reward_type as ReferralRewardType)}`,
      redemptionId: row.id,
    });
  }

  return pending.length;
}

export async function getRedemptionHistory(
  supabase: SupabaseClient,
  userId: string
) {
  const { data } = await supabase
    .from('redemptions')
    .select('id, reward_type, points_spent, status, created_at, sent_at, notes')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    rewardType: row.reward_type as ReferralRewardType,
    rewardLabel: rewardLabel(row.reward_type as ReferralRewardType),
    pointsSpent: row.points_spent,
    status: row.status,
    createdAt: row.created_at,
    sentAt: row.sent_at,
    notes: row.notes,
  }));
}
