import {
  THEME_VOTE_MAX_CHANGES,
  type SubscriberThemePollView,
  type ThemePollWithTallies,
  type ThemeUserVote,
} from '@/lib/theme-votes/types';

export function toSubscriberThemePollView(
  poll: ThemePollWithTallies,
  userVote: ThemeUserVote | null,
  canVote: boolean
): SubscriberThemePollView {
  const hideTallies = poll.status !== 'ended';
  const userVoteOptionId = userVote?.optionId ?? null;
  const voteChangeCount = userVote?.changeCount ?? 0;
  const openAndEligible = canVote && poll.status === 'open';

  return {
    ...poll,
    totalVotes: hideTallies ? 0 : poll.totalVotes,
    winnerOptionId: hideTallies ? null : poll.winnerOptionId,
    isTie: hideTallies ? false : poll.isTie,
    options: poll.options.map((option) =>
      hideTallies ? { ...option, voteCount: 0, percent: 0 } : option
    ),
    userVoteOptionId,
    voteChangeCount,
    canVote: openAndEligible && !userVoteOptionId,
    canChangeVote:
      openAndEligible &&
      Boolean(userVoteOptionId) &&
      voteChangeCount < THEME_VOTE_MAX_CHANGES,
  };
}
