/** Flags seguras para o browser (apenas chaves NEXT_PUBLIC_*). */
export const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? '';

export const MP_BRICK_READY = Boolean(MP_PUBLIC_KEY);
