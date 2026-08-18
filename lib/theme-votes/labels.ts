import type { ThemePollStatus } from '@/lib/theme-votes/types';

export const THEME_POLL_STATUS_LABEL: Record<ThemePollStatus, string> = {
  upcoming: 'Agendada',
  open: 'Aberta',
  ended: 'Encerrada',
};
