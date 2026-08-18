'use server';

import { revalidatePath } from 'next/cache';
import { requireDashboardUser } from '@/lib/dashboard/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { profileIsAdmin } from '@/lib/theme-votes/access';
import { submitThemeVote } from '@/lib/theme-votes/submit';

export async function voteThemeAction(pollId: string, optionId: string) {
  const { user } = await requireDashboardUser();
  const admin = createAdminClient();
  const isAdmin = await profileIsAdmin(admin, user.id);
  const result = await submitThemeVote(admin, {
    userId: user.id,
    pollId,
    optionId,
    isAdmin,
  });

  if ('error' in result) return result;

  revalidatePath('/dashboard', 'layout');
  return { success: true as const };
}
