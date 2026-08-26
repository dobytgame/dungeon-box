import type { SupabaseClient } from '@supabase/supabase-js';
import { getThemePollStatus } from '@/lib/theme-votes/window';
import type {
  AdminThemePollDetail,
  ThemeOption,
  ThemeOptionTally,
  ThemePoll,
  ThemePollVoter,
  ThemePollWithTallies,
} from '@/lib/theme-votes/types';

type OptionRow = {
  id: string;
  poll_id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
};

type PollRow = {
  id: string;
  cycle_number: number;
  starts_at: string;
  ends_at: string;
  created_at: string | null;
  updated_at: string | null;
  theme_options?: OptionRow[] | OptionRow | null;
};

const POLL_SELECT = `
  id,
  cycle_number,
  starts_at,
  ends_at,
  created_at,
  updated_at,
  theme_options (
    id,
    poll_id,
    name,
    image_url,
    sort_order
  )
`;

function mapOption(row: OptionRow): ThemeOption | null {
  if (row.sort_order !== 1 && row.sort_order !== 2) return null;
  return {
    id: row.id,
    poll_id: row.poll_id,
    name: row.name,
    image_url: row.image_url,
    sort_order: row.sort_order,
  };
}

function mapPoll(row: PollRow): ThemePoll {
  const options = (Array.isArray(row.theme_options)
    ? row.theme_options
    : row.theme_options
      ? [row.theme_options]
      : []
  )
    .map(mapOption)
    .filter((option): option is ThemeOption => option !== null)
    .sort((a, b) => a.sort_order - b.sort_order);

  return {
    id: row.id,
    cycle_number: row.cycle_number,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    options,
  };
}

function withTallies(
  poll: ThemePoll,
  voteCounts: Map<string, number>
): ThemePollWithTallies {
  const totalVotes = poll.options.reduce(
    (sum, option) => sum + (voteCounts.get(option.id) ?? 0),
    0
  );

  const options: ThemeOptionTally[] = poll.options.map((option) => {
    const voteCount = voteCounts.get(option.id) ?? 0;
    return {
      ...option,
      voteCount,
      percent: totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0,
    };
  });

  const maxVotes = Math.max(0, ...options.map((option) => option.voteCount));
  const leaders = options.filter(
    (option) => option.voteCount === maxVotes && maxVotes > 0
  );

  return {
    ...poll,
    status: getThemePollStatus(poll.starts_at, poll.ends_at),
    totalVotes,
    options,
    winnerOptionId: leaders.length === 1 ? leaders[0]!.id : null,
    isTie: leaders.length > 1,
  };
}

async function loadVoteCounts(
  client: SupabaseClient,
  pollIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (pollIds.length === 0) return counts;

  const { data, error } = await client
    .from('theme_votes')
    .select('theme_option_id')
    .in('poll_id', pollIds);

  if (error) {
    console.error('[theme-votes] loadVoteCounts:', error.message);
    return counts;
  }

  for (const row of data ?? []) {
    const optionId = row.theme_option_id as string;
    counts.set(optionId, (counts.get(optionId) ?? 0) + 1);
  }

  return counts;
}

export async function listThemePolls(
  client: SupabaseClient
): Promise<ThemePoll[]> {
  const { data, error } = await client
    .from('theme_polls')
    .select(POLL_SELECT)
    .order('cycle_number', { ascending: false });

  if (error) {
    console.error('[theme-votes] listThemePolls:', error.message);
    return [];
  }

  return ((data ?? []) as PollRow[]).map(mapPoll);
}

export async function listThemePollsWithTallies(
  client: SupabaseClient
): Promise<ThemePollWithTallies[]> {
  const polls = await listThemePolls(client);
  const counts = await loadVoteCounts(
    client,
    polls.map((poll) => poll.id)
  );
  return polls.map((poll) => withTallies(poll, counts));
}

export async function getThemePoll(
  client: SupabaseClient,
  pollId: string
): Promise<ThemePoll | null> {
  const { data, error } = await client
    .from('theme_polls')
    .select(POLL_SELECT)
    .eq('id', pollId)
    .maybeSingle();

  if (error) {
    console.error('[theme-votes] getThemePoll:', error.message);
    return null;
  }

  return data ? mapPoll(data as PollRow) : null;
}

export async function getThemePollWithTallies(
  client: SupabaseClient,
  pollId: string
): Promise<ThemePollWithTallies | null> {
  const poll = await getThemePoll(client, pollId);
  if (!poll) return null;
  const counts = await loadVoteCounts(client, [poll.id]);
  return withTallies(poll, counts);
}

export async function getUserVoteOptionId(
  client: SupabaseClient,
  userId: string,
  pollId: string
): Promise<string | null> {
  const { data, error } = await client
    .from('theme_votes')
    .select('theme_option_id')
    .eq('user_id', userId)
    .eq('poll_id', pollId)
    .maybeSingle();

  if (error) {
    console.error('[theme-votes] getUserVoteOptionId:', error.message);
    return null;
  }

  return (data?.theme_option_id as string | undefined) ?? null;
}

export async function userHasActiveSubscription(
  client: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await client
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[theme-votes] userHasActiveSubscription:', error.message);
    return false;
  }

  return Boolean(data);
}

export function pickFeaturedThemePoll<T extends { status: string; cycle_number: number }>(
  polls: T[]
): T | null {
  const byCycle = (a: T, b: T) => a.cycle_number - b.cycle_number;
  const open = polls.filter((poll) => poll.status === 'open').sort(byCycle);
  if (open[0]) return open[0];
  const ended = polls
    .filter((poll) => poll.status === 'ended')
    .sort((a, b) => b.cycle_number - a.cycle_number);
  if (ended[0]) return ended[0];
  const upcoming = polls.filter((poll) => poll.status === 'upcoming').sort(byCycle);
  return upcoming[0] ?? null;
}

export async function getLatestEndedThemePollWithTallies(
  client: SupabaseClient
): Promise<ThemePollWithTallies | null> {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('theme_polls')
    .select(POLL_SELECT)
    .lt('ends_at', now)
    .order('cycle_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[theme-votes] getLatestEndedThemePoll:', error.message);
    return null;
  }

  if (!data) return null;

  const poll = mapPoll(data as PollRow);
  const counts = await loadVoteCounts(client, [poll.id]);
  return withTallies(poll, counts);
}

export async function getOpenThemePoll(
  client: SupabaseClient
): Promise<ThemePoll | null> {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('theme_polls')
    .select(POLL_SELECT)
    .lte('starts_at', now)
    .gte('ends_at', now)
    .order('cycle_number', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[theme-votes] getOpenThemePoll:', error.message);
    return null;
  }

  return data ? mapPoll(data as PollRow) : null;
}

export async function getAdminThemePollDetail(
  admin: SupabaseClient,
  pollId: string
): Promise<AdminThemePollDetail | null> {
  const poll = await getThemePollWithTallies(admin, pollId);
  if (!poll) return null;

  const { data, error } = await admin
    .from('theme_votes')
    .select('id, user_id, theme_option_id, voted_at')
    .eq('poll_id', pollId)
    .order('voted_at', { ascending: false });

  if (error) {
    console.error('[theme-votes] getAdminThemePollDetail:', error.message);
    return { ...poll, voters: [] };
  }

  const votes = data ?? [];
  const userIds = Array.from(new Set(votes.map((row) => row.user_id as string)));
  const profiles = new Map<
    string,
    { full_name: string | null; display_name: string | null; email: string | null }
  >();

  if (userIds.length > 0) {
    const { data: profileRows, error: profileError } = await admin
      .from('profiles')
      .select('id, full_name, display_name, email')
      .in('id', userIds);

    if (profileError) {
      console.error('[theme-votes] load voters:', profileError.message);
    } else {
      for (const row of profileRows ?? []) {
        profiles.set(row.id as string, {
          full_name: row.full_name as string | null,
          display_name: row.display_name as string | null,
          email: row.email as string | null,
        });
      }
    }
  }

  const optionNameById = new Map(
    poll.options.map((option) => [option.id, option.name])
  );

  const voters: ThemePollVoter[] = votes.map((row) => {
    const profile = profiles.get(row.user_id as string);
    return {
      id: row.id as string,
      userId: row.user_id as string,
      optionId: row.theme_option_id as string,
      optionName: optionNameById.get(row.theme_option_id as string) ?? '—',
      votedAt: row.voted_at as string,
      customerName: profile?.display_name || profile?.full_name || null,
      customerEmail: profile?.email ?? null,
    };
  });

  return { ...poll, voters };
}
