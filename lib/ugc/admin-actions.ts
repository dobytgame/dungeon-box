'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { logAdminAction } from '@/lib/admin/audit';
import { requireAdmin } from '@/lib/admin/auth';
import { UGC_REJECT_REASONS, type UgcRejectReason } from '@/lib/ugc/constants';
import { notifyUgcApproved, notifyUgcRejected } from '@/lib/ugc/notify';
import {
  UGC_POTENTIALS,
  UGC_USAGE_TAGS,
  type UgcPotential,
  type UgcUsageTag,
} from '@/lib/ugc/options';
import { clearQueuedUgcReward, markUgcRewardsSentForCycle, queueUgcRewardOnCycle } from '@/lib/ugc/reward';

async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}

function isRejectReason(value: string): value is UgcRejectReason {
  return UGC_REJECT_REASONS.some((reason) => reason.value === value);
}

async function revalidateUgc(submissionId: string, cycleId?: string | null) {
  revalidatePath('/admin/ugc');
  revalidatePath(`/admin/ugc/${submissionId}`);
  revalidatePath('/dashboard/aventura');
  if (cycleId) {
    revalidatePath(`/admin/ciclos/${cycleId}`);
    revalidatePath('/admin/ciclos');
  }
}

export async function adminApproveUgcAction(submissionId: string) {
  const { user, admin } = await requireAdmin();

  const { data: existing, error: fetchError } = await admin
    .from('ugc_submissions')
    .select('id, user_id, content_status, reward_status, reward_cycle_id')
    .eq('id', submissionId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: 'Envio não encontrado.' };

  const now = new Date().toISOString();
  const { error } = await admin
    .from('ugc_submissions')
    .update({
      content_status: 'approved',
      reject_reason: null,
      reviewer_id: user.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', submissionId);

  if (error) return { error: error.message };

  let reward:
    | { queued: true; cycleId: string; cycleNumber: number }
    | { queued: false; reason: 'already_queued' | 'no_cycle' }
    | null = null;

  if (existing.reward_status !== 'queued' && existing.reward_status !== 'sent') {
    reward = await queueUgcRewardOnCycle(admin, {
      submissionId,
      userId: existing.user_id as string,
    });
  }

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'ugc.approve',
    entityType: 'ugc_submission',
    entityId: submissionId,
    metadata: { reward },
    ipAddress: await clientIp(),
  });

  await revalidateUgc(
    submissionId,
    reward && reward.queued ? reward.cycleId : existing.reward_cycle_id
  );

  void notifyUgcApproved(
    admin,
    existing.user_id as string,
    reward && reward.queued ? reward.cycleNumber : null
  );

  if (reward?.queued) {
    return {
      success: true as const,
      rewardQueued: true as const,
      cycleNumber: reward.cycleNumber,
    };
  }

  if (existing.reward_status === 'queued' || existing.reward_status === 'sent') {
    return { success: true as const, rewardQueued: true as const };
  }

  return {
    success: true as const,
    rewardQueued: false as const,
    rewardReason: reward?.reason ?? 'no_cycle',
  };
}

export async function adminRejectUgcAction(
  submissionId: string,
  reason: string,
  note?: string | null
) {
  const { user, admin } = await requireAdmin();

  if (!isRejectReason(reason)) {
    return { error: 'Informe um motivo de recusa.' };
  }

  const { data: existing, error: fetchError } = await admin
    .from('ugc_submissions')
    .select('id, user_id, reward_status, reward_cycle_id')
    .eq('id', submissionId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: 'Envio não encontrado.' };

  if (existing.reward_status === 'queued') {
    await clearQueuedUgcReward(admin, {
      submissionId,
      cycleId: (existing.reward_cycle_id as string | null) ?? null,
    });
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from('ugc_submissions')
    .update({
      content_status: 'rejected',
      reject_reason: reason,
      review_note: note?.trim() || null,
      reviewer_id: user.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', submissionId);

  if (error) return { error: error.message };

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'ugc.reject',
    entityType: 'ugc_submission',
    entityId: submissionId,
    metadata: { reason },
    ipAddress: await clientIp(),
  });

  void notifyUgcRejected(admin, existing.user_id as string);
  await revalidateUgc(submissionId, existing.reward_cycle_id as string | null);
  return { success: true as const };
}

export async function adminUpdateUgcMarketingAction(
  submissionId: string,
  input: {
    usageTags: string[];
    potential: string | null;
    notes: string | null;
  }
) {
  const { user, admin } = await requireAdmin();

  const usageTags = input.usageTags.filter((tag): tag is UgcUsageTag =>
    UGC_USAGE_TAGS.some((item) => item.value === tag)
  );
  const potential =
    input.potential && UGC_POTENTIALS.some((item) => item.value === input.potential)
      ? (input.potential as UgcPotential)
      : null;

  const { error } = await admin
    .from('ugc_submissions')
    .update({
      usage_tags: usageTags,
      marketing_potential: potential,
      marketing_notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId);

  if (error) return { error: error.message };

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'ugc.classify',
    entityType: 'ugc_submission',
    entityId: submissionId,
    metadata: { usageTags, potential },
    ipAddress: await clientIp(),
  });

  await revalidateUgc(submissionId);
  return { success: true as const };
}

export async function adminMarkUgcRewardSentAction(submissionId: string) {
  const { user, admin } = await requireAdmin();

  const { data: existing, error: fetchError } = await admin
    .from('ugc_submissions')
    .select('id, reward_status, reward_cycle_id')
    .eq('id', submissionId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: 'Envio não encontrado.' };
  if (existing.reward_status !== 'queued' && existing.reward_status !== 'sent') {
    return { error: 'Este envio ainda não tem brinde na fila.' };
  }

  const { error } = await admin
    .from('ugc_submissions')
    .update({
      reward_status: 'sent',
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId);

  if (error) return { error: error.message };

  await logAdminAction(admin, {
    actorId: user.id,
    action: 'ugc.reward_sent',
    entityType: 'ugc_submission',
    entityId: submissionId,
    ipAddress: await clientIp(),
  });

  await revalidateUgc(submissionId, existing.reward_cycle_id as string | null);
  return { success: true as const };
}

export async function adminMarkCycleUgcRewardsSentAction(cycleId: string) {
  const { admin } = await requireAdmin();
  const count = await markUgcRewardsSentForCycle(admin, cycleId);
  revalidatePath('/admin/ugc');
  revalidatePath(`/admin/ciclos/${cycleId}`);
  return { success: true as const, count };
}
