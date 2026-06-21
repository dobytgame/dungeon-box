export type ReferralRank = {
  level: number;
  slug: string;
  name: string;
  icon: 'scroll' | 'flag' | 'shield' | 'crown' | 'dragon';
  minConversions: number;
  description: string;
};

export const REFERRAL_RANKS: ReferralRank[] = [
  {
    level: 1,
    slug: 'recruta',
    name: 'Recruta',
    icon: 'scroll',
    minConversions: 0,
    description: 'Começou a espalhar a palavra da guilda.',
  },
  {
    level: 2,
    slug: 'emissario',
    name: 'Emissário',
    icon: 'flag',
    minConversions: 1,
    description: 'Sua primeira indicação virou assinante.',
  },
  {
    level: 3,
    slug: 'herold',
    name: 'Herold',
    icon: 'shield',
    minConversions: 3,
    description: 'Três mestres entraram na guilda pelo seu link.',
  },
  {
    level: 4,
    slug: 'campeao',
    name: 'Campeão',
    icon: 'crown',
    minConversions: 6,
    description: 'Referência entre os aventureiros da mesa.',
  },
  {
    level: 5,
    slug: 'lenda',
    name: 'Lenda',
    icon: 'dragon',
    minConversions: 10,
    description: 'Lendário em convocar novos heróis para a DungeonBox.',
  },
];

export function getReferralRank(conversions: number): ReferralRank {
  let current = REFERRAL_RANKS[0]!;
  for (const rank of REFERRAL_RANKS) {
    if (conversions >= rank.minConversions) current = rank;
  }
  return current;
}

export function getNextReferralRank(conversions: number): ReferralRank | null {
  return REFERRAL_RANKS.find((r) => r.minConversions > conversions) ?? null;
}

export function rankProgress(conversions: number): {
  current: ReferralRank;
  next: ReferralRank | null;
  progress: number;
  remaining: number;
} {
  const current = getReferralRank(conversions);
  const next = getNextReferralRank(conversions);

  if (!next) {
    return { current, next: null, progress: 100, remaining: 0 };
  }

  const span = next.minConversions - current.minConversions;
  const gained = conversions - current.minConversions;
  const progress = Math.min(100, Math.round((gained / span) * 100));
  const remaining = next.minConversions - conversions;

  return { current, next, progress, remaining };
}
