import Stripe from 'stripe';

export function userFacingStripeError(error: unknown): string {
  if (error instanceof Stripe.errors.StripeCardError) {
    return error.message || 'Cartão recusado. Tente outro cartão.';
  }
  if (error instanceof Stripe.errors.StripeInvalidRequestError) {
    return error.message || 'Dados de pagamento inválidos.';
  }
  if (error instanceof Stripe.errors.StripeAPIError) {
    return 'O Stripe está temporariamente indisponível. Tente novamente em instantes.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Erro ao processar pagamento.';
}
