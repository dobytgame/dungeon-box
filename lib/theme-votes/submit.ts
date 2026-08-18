import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getThemePoll,
  userHasActiveSubscription,
} from '@/lib/theme-votes/queries';
import { userCanCastThemeVote } from '@/lib/theme-votes/access';
import { isThemePollOpen } from '@/lib/theme-votes/window';

export async function submitThemeVote(
  admin: SupabaseClient,
  input: {
    userId: string;
    pollId: string;
    optionId: string;
    isAdmin?: boolean;
  }
): Promise<{ voteId: string } | { error: string }> {
  const isActiveSubscriber = await userHasActiveSubscription(admin, input.userId);
  if (!userCanCastThemeVote(input.isAdmin === true, isActiveSubscriber)) {
    return { error: 'A votação ainda não está disponível.' };
  }

  const poll = await getThemePoll(admin, input.pollId);
  if (!poll) {
    return { error: 'Votação não encontrada.' };
  }

  if (!isThemePollOpen(poll.starts_at, poll.ends_at)) {
    return { error: 'Esta votação não está aberta no momento.' };
  }

  const option = poll.options.find((item) => item.id === input.optionId);
  if (!option) {
    return { error: 'Opção de tema inválida.' };
  }

  const { data, error } = await admin
    .from('theme_votes')
    .insert({
      user_id: input.userId,
      poll_id: input.pollId,
      theme_option_id: input.optionId,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'Você já votou nesta enquete.' };
    }
    console.error('[theme-votes] submitThemeVote:', error.message);
    return { error: 'Não foi possível registrar seu voto.' };
  }

  return { voteId: data.id as string };
}
