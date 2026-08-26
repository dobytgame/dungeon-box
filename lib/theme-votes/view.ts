import type { SubscriberThemePollView, ThemePollWithTallies } from '@/lib/theme-votes/types';

export function toSubscriberThemePollView(
  poll: ThemePollWithTallies,
  userVoteOptionId: string | null,
  canVote: boolean
): SubscriberThemePollView {
  const hideTallies = poll.status !== 'ended';
  return {
    ...poll,
    totalVotes: hideTallies ? 0 : poll.totalVotes,
    winnerOptionId: hideTallies ? null : poll.winnerOptionId,
    isTie: hideTallies ? false : poll.isTie,
    options: poll.options.map((option) =>
      hideTallies ? { ...option, voteCount: 0, percent: 0 } : option
    ),
    userVoteOptionId,
    canVote: canVote && poll.status === 'open' && !userVoteOptionId,
  };
}
