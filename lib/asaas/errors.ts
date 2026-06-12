import { AsaasApiError } from '@/lib/asaas/client';

export function userFacingAsaasError(error: unknown): string {
  if (error instanceof AsaasApiError) {
    if (error.status === 400) {
      return error.message || 'Dados de pagamento inválidos.';
    }
    if (error.status === 401) {
      console.error(
        '[asaas] invalid_access_token — confira ASAAS_API_KEY e ASAAS_ENV no deploy. ' +
          'Na Vercel cole a chave completa começando com $ (sem barra invertida). ' +
          'Sandbox: ASAAS_ENV=sandbox + chave $aact_hmlg_; produção: ASAAS_ENV=production + chave $aact_prod_.'
      );
      return 'Integração Asaas indisponível. Tente novamente mais tarde.';
    }
    return error.message || 'Não foi possível processar o pagamento.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Erro ao processar pagamento.';
}
