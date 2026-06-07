export type MpCredentialMode = 'test' | 'production' | 'missing' | 'unknown';

export function getMpCredentialMode(key: string | undefined): MpCredentialMode {
  if (!key?.trim()) return 'missing';
  if (key.startsWith('TEST-')) return 'test';
  if (key.startsWith('APP_USR-')) return 'production';
  return 'unknown';
}

export function validateMpCredentialPair(): {
  ok: boolean;
  error?: string;
  publicMode: MpCredentialMode;
  tokenMode: MpCredentialMode;
} {
  const publicMode = getMpCredentialMode(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY);
  const tokenMode = getMpCredentialMode(process.env.MP_ACCESS_TOKEN);

  if (publicMode === 'missing' || tokenMode === 'missing') {
    return {
      ok: false,
      publicMode,
      tokenMode,
      error: 'Configure NEXT_PUBLIC_MP_PUBLIC_KEY e MP_ACCESS_TOKEN.',
    };
  }

  if (publicMode === 'unknown' || tokenMode === 'unknown') {
    return {
      ok: false,
      publicMode,
      tokenMode,
      error:
        'Chaves Mercado Pago com formato inválido. Use credenciais de teste (TEST-) ou produção (APP_USR-) do painel Developers.',
    };
  }

  if (publicMode !== tokenMode) {
    return {
      ok: false,
      publicMode,
      tokenMode,
      error:
        'Chaves Mercado Pago incompatíveis: a pública e o access token devem ser ambas de teste (TEST-) ou ambas de produção (APP_USR-), da mesma aplicação.',
    };
  }

  return { ok: true, publicMode, tokenMode };
}

export function mpCardTokenNotFoundMessage(): string {
  return [
    'O Mercado Pago não reconheceu o token do cartão.',
    'Confira se NEXT_PUBLIC_MP_PUBLIC_KEY e MP_ACCESS_TOKEN são da mesma aplicação.',
    'Na Vercel, alterar a chave pública exige novo deploy.',
    'No sandbox, use e-mail diferente do da conta vendedora e cartão de teste do MP.',
  ].join(' ');
}
