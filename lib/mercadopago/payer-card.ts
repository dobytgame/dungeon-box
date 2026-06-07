import { Customer } from 'mercadopago';
import { getMpConfig } from '@/lib/mercadopago';

interface AttachCardInput {
  cardTokenId: string;
  payerEmail: string;
  payerName?: string | null;
  cpf?: string;
}

/**
 * Saves the Brick card token on a MP customer and returns card_id for preapproval.
 * Workaround when direct card_token_id on /preapproval returns 404 in sandbox.
 */
export async function attachCardTokenToPayer({
  cardTokenId,
  payerEmail,
  payerName,
  cpf,
}: AttachCardInput): Promise<number> {
  const customerClient = new Customer(getMpConfig());

  const search = await customerClient.search({
    options: { email: payerEmail },
  });

  let customerId = search.results?.[0]?.id;

  if (!customerId) {
    const nameParts = payerName?.trim().split(/\s+/).filter(Boolean) ?? [];
    const created = await customerClient.create({
      body: {
        email: payerEmail,
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(' ') || undefined,
        identification:
          cpf && cpf.length === 11
            ? { type: 'CPF', number: cpf }
            : undefined,
      },
    });
    customerId = created.id;
  }

  if (!customerId) {
    throw new Error('Não foi possível registrar o pagador no Mercado Pago.');
  }

  const card = await customerClient.createCard({
    customerId,
    body: { token: cardTokenId },
  });

  const cardId = card.id != null ? Number(card.id) : NaN;
  if (!Number.isFinite(cardId)) {
    throw new Error('Não foi possível salvar o cartão no Mercado Pago.');
  }

  return cardId;
}
