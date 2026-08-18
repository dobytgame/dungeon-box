import type { ThemePollStatus } from '@/lib/theme-votes/types';

export function getThemePollStatus(
  startsAt: string,
  endsAt: string,
  now = new Date()
): ThemePollStatus {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const current = now.getTime();

  if (current < start) return 'upcoming';
  if (current > end) return 'ended';
  return 'open';
}

export function isThemePollOpen(
  startsAt: string,
  endsAt: string,
  now = new Date()
): boolean {
  return getThemePollStatus(startsAt, endsAt, now) === 'open';
}
