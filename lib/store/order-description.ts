import { PAGARME_ITEM_DESCRIPTION_MAX_LENGTH } from '@/lib/pagarme/item-description';

const ASAAS_PAYMENT_DESCRIPTION_MAX_LENGTH = 500;

type OrderLine = { quantity: number; name: string };

export function storeOrderDescriptionMaxLength(gateway: 'pagarme' | 'asaas'): number {
  return gateway === 'pagarme'
    ? PAGARME_ITEM_DESCRIPTION_MAX_LENGTH
    : ASAAS_PAYMENT_DESCRIPTION_MAX_LENGTH;
}

/** Texto enviado ao gateway na cobrança (detalhes completos ficam no meta do pedido). */
export function buildStoreOrderPaymentDescription(
  lines: OrderLine[],
  maxLength: number
): string {
  const prefix = 'DungeonBox Loja — ';
  if (maxLength <= prefix.length + 1) {
    return prefix.trim();
  }

  const join = (segments: string[]) => prefix + segments.join(', ');
  const parts: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    let segment = `${line.quantity}x ${line.name}`.trim();

    const candidate = join([...parts, segment]);

    if (candidate.length <= maxLength) {
      parts.push(segment);
      continue;
    }

    const remaining = lines.length - index;
    if (parts.length > 0 && remaining > 0) {
      const suffix = ` (+${remaining} itens)`;
      while (parts.length > 0 && join([...parts, suffix]).length > maxLength) {
        parts.pop();
      }
      if (join([...parts, suffix]).length <= maxLength) {
        return join([...parts, suffix]);
      }
    }

    const budget = maxLength - prefix.length;
    if (budget <= 0) return prefix.trim();
    segment =
      segment.length > budget
        ? `${segment.slice(0, Math.max(1, budget - 1))}…`
        : segment;
    return join([segment]);
  }

  return join(parts);
}
