import type { SupabaseClient } from '@supabase/supabase-js';
import type { UgcContentStatus, UgcSubmissionListItem } from '@/lib/ugc/types';

type SubmissionRow = {
  id: string;
  content_status: UgcContentStatus;
  reward_status: 'none' | 'queued' | 'sent';
  context: string;
  created_at: string;
  ugc_media?: { id: string }[] | null;
};

export async function listUgcSubmissionsForUser(
  admin: SupabaseClient,
  userId: string
): Promise<UgcSubmissionListItem[]> {
  const { data, error } = await admin
    .from('ugc_submissions')
    .select('id, content_status, reward_status, context, created_at, ugc_media(id)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[ugc] listUgcSubmissionsForUser:', error.message);
    return [];
  }

  return ((data ?? []) as SubmissionRow[]).map((row) => ({
    id: row.id,
    contentStatus: row.content_status,
    rewardStatus: row.reward_status,
    context: row.context,
    createdAt: row.created_at,
    mediaCount: row.ugc_media?.length ?? 0,
  }));
}
