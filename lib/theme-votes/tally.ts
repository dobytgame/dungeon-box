/** Fatia de votos válidos (cada voto de assinante conta 1). */
export function validVoteShare(
  voteCount: number,
  totalValidVotes: number
): number {
  if (totalValidVotes <= 0 || voteCount <= 0) return 0;
  return (voteCount / totalValidVotes) * 100;
}

export function formatValidVotePercent(share: number): string {
  if (!Number.isFinite(share) || share <= 0) return '0';
  const rounded = Math.round(share * 10) / 10;
  return rounded.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
    maximumFractionDigits: 1,
  });
}
