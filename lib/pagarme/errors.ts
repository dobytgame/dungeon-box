import { PagarmeApiError } from '@/lib/pagarme/client';

export function userFacingPagarmeError(error: unknown): string {
  if (error instanceof PagarmeApiError) {
    if (error.status === 422) {
      const fieldErrors = Object.entries(error.body.errors ?? {})
        .flatMap(([, messages]) => messages)
        .filter((message): message is string => typeof message === 'string');
      if (fieldErrors.length > 0) {
        return fieldErrors[0] ?? 'Dados de pagamento inválidos.';
      }
    }
    if (error.status === 400) {
      return error.message || 'Dados de pagamento inválidos.';
    }
    if (error.status === 401) {
      console.error(
        '[pagarme] invalid credentials — confira PAGARME_SECRET_KEY no deploy.'
      );
      return 'Integração Pagar.me indisponível. Tente novamente mais tarde.';
    }
    return error.message || 'Não foi possível processar o pagamento.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Erro ao processar pagamento.';
}
