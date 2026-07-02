export const REFERRAL_COOKIE_NAME = 'db_ref';
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const REFERRAL_BASE_POINTS = 100;
export const REFERRAL_BONUS_POINTS = 20;
export const REFERRAL_BONUS_FROM_NTH = 3;
export const REFERRAL_MONTHLY_CREDIT_LIMIT = 5;
export const REFERRAL_QUALIFICATION_DAYS = 30;
export const REFERRAL_POINTS_VALIDITY_MONTHS = 12;
export const REFERRAL_EXPIRY_WARNING_DAYS = 30;

export const REFERRAL_REWARDS = [
  {
    type: 'tintas' as const,
    label: 'Kit de tintas básico',
    points: 100,
    description: 'Produto físico — envio junto ao próximo kit',
  },
  {
    type: 'avulso' as const,
    label: 'Produto avulso da loja (até R$ 60)',
    points: 200,
    description: 'Você escolhe o produto',
  },
  {
    type: 'aventureiro' as const,
    label: 'Kit adicional Aventureiro',
    points: 300,
    description: 'Enviado junto ao próximo envio mensal',
  },
  {
    type: 'heroi' as const,
    label: 'Kit adicional Herói',
    points: 500,
    description: 'Enviado junto ao próximo envio mensal',
  },
  {
    type: 'lendario' as const,
    label: 'Kit Lendário completo + frete grátis',
    points: 1000,
    description: 'Frete incluso nesta recompensa',
  },
] as const;

export type ReferralRewardType = (typeof REFERRAL_REWARDS)[number]['type'];

export const REFERRAL_STATUS_LABELS: Record<string, string> = {
  signed_up: 'Cadastrou (sem assinatura)',
  pending: 'Pendente',
  qualified: 'Qualificado',
  cancelled: 'Cancelado',
  expired: 'Expirado',
};

export const REDEMPTION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  sent: 'Enviado',
  cancelled: 'Cancelado',
};
