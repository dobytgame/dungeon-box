/** Nível de fidelidade com base em ciclos pagos. */
export function calculateLoyaltyLevel(cycles: number): number {
  if (cycles >= 12) return 5;
  if (cycles >= 9) return 4;
  if (cycles >= 5) return 3;
  if (cycles >= 2) return 2;
  return 1;
}
