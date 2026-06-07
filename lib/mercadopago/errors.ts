import { mpCardTokenNotFoundMessage } from '@/lib/mercadopago/credentials';

type MpErrorShape = {
  message?: string;
  status?: number;
  cause?: unknown;
};

export function parseMpError(error: unknown): MpErrorShape {
  if (error && typeof error === 'object') {
    const e = error as MpErrorShape;
    if (typeof e.message === 'string') {
      return { message: e.message, status: e.status, cause: e.cause };
    }
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: 'Erro ao processar pagamento.' };
}

export function userFacingMpError(error: unknown): string {
  const parsed = parseMpError(error) as ReturnType<typeof parseMpError> & {
    error?: string;
  };
  const { message, status } = parsed;
  const lower = message?.toLowerCase() ?? '';

  if (
    status === 404 &&
    lower.includes('card token service not found')
  ) {
    return mpCardTokenNotFoundMessage();
  }

  if (
    status === 500 ||
    parsed.error === 'internal_server_error' ||
    lower.includes('something went wrong') ||
    lower.includes('internal server error')
  ) {
    return 'O Mercado Pago retornou um erro temporário ao criar a assinatura. Tente novamente em instantes.';
  }

  return message ?? 'Erro ao processar pagamento.';
}

export function isCardTokenNotFoundError(error: unknown): boolean {
  const { message, status } = parseMpError(error);
  return (
    status === 404 &&
    Boolean(message?.toLowerCase().includes('card token service not found'))
  );
}
