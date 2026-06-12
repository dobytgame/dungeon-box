import { AsaasApiError } from '@/lib/asaas/client';

export function userFacingAsaasError(error: unknown): string {
  if (error instanceof AsaasApiError) {
    if (error.status === 400) {
      return error.message || 'Dados de pagamento inválidos.';
    }
    if (error.status === 401) {
      return 'Integração Asaas indisponível. Tente novamente mais tarde.';
    }
    return error.message || 'Não foi possível processar o pagamento.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Erro ao processar pagamento.';
}
