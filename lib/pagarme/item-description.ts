/** Limite da API Pagar.me para `items[].description` em pedidos avulsos e assinaturas. */
export const PAGARME_ITEM_DESCRIPTION_MAX_LENGTH = 256;

export function truncatePagarmeItemDescription(description: string): string {
  const trimmed = description.trim();
  if (trimmed.length <= PAGARME_ITEM_DESCRIPTION_MAX_LENGTH) {
    return trimmed;
  }
  const ellipsis = '…';
  return trimmed.slice(0, PAGARME_ITEM_DESCRIPTION_MAX_LENGTH - ellipsis.length) + ellipsis;
}
