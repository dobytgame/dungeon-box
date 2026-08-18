export const THEME_VOTE_MIN_CYCLE = 3;

export type ThemePollStatus = 'upcoming' | 'open' | 'ended';

export type ThemeOption = {
  id: string;
  poll_id: string;
  name: string;
  image_url: string | null;
  sort_order: 1 | 2;
};

export type ThemePoll = {
  id: string;
  cycle_number: number;
  starts_at: string;
  ends_at: string;
  created_at: string | null;
  updated_at: string | null;
  options: ThemeOption[];
};

export type ThemeOptionTally = ThemeOption & {
  voteCount: number;
  percent: number;
};

export type ThemePollWithTallies = Omit<ThemePoll, 'options'> & {
  status: ThemePollStatus;
  totalVotes: number;
  options: ThemeOptionTally[];
  winnerOptionId: string | null;
  isTie: boolean;
};

export type ThemePollVoter = {
  id: string;
  userId: string;
  optionId: string;
  optionName: string;
  votedAt: string;
  customerName: string | null;
  customerEmail: string | null;
};

export type AdminThemePollDetail = ThemePollWithTallies & {
  voters: ThemePollVoter[];
};

export type SubscriberThemePollView = ThemePollWithTallies & {
  userVoteOptionId: string | null;
  canVote: boolean;
};
