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
  const { message, status } = parseMpError(error);

  if (
    status === 404 &&
    message?.toLowerCase().includes('card token service not found')
  ) {
    return mpCardTokenNotFoundMessage();
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
