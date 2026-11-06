export const BLACK_FRIDAY_START = Date.parse('2026-11-27T00:00:00-03:00');
export const BLACK_FRIDAY_END = Date.parse('2026-12-01T00:00:00-03:00');

export function getBlackFridayPhase(now: number, bonusReady: boolean) {
  if (now >= BLACK_FRIDAY_END) return 'closed';
  if (now < BLACK_FRIDAY_START) return 'upcoming';
  return bonusReady ? 'active' : 'unavailable';
}
