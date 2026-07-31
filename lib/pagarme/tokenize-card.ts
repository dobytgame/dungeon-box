import { PAGARME_PUBLIC_KEY } from '@/lib/pagarme/public';

export type PagarmeCardInput = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
};

type PagarmeTokenResponse = {
  id?: string;
  message?: string;
  errors?: Record<string, string[]>;
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function normalizeExpiryYear(raw: string): string {
  const digits = digitsOnly(raw);
  if (digits.length === 2) return `20${digits}`;
  if (digits.length === 4) return digits;
  throw new Error('Ano de validade inválido.');
}

function normalizeExpiryMonth(raw: string): string {
  const digits = digitsOnly(raw);
  const month = Number.parseInt(digits, 10);
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error('Mês de validade inválido.');
  }
  return String(month).padStart(2, '0');
}

function detectBrand(number: string): string {
  const digits = digitsOnly(number);
  if (/^4/.test(digits)) return 'visa';
  if (/^5[1-5]/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^6(?:011|5)/.test(digits)) return 'discover';
  return 'unknown';
}

export async function tokenizePagarmeCard(
  card: PagarmeCardInput
): Promise<{ token: string; last4: string; brand: string }> {
  if (!PAGARME_PUBLIC_KEY) {
    throw new Error('Pagar.me não configurado para tokenização.');
  }

  const expMonth = normalizeExpiryMonth(card.expiryMonth);
  const expYear = normalizeExpiryYear(card.expiryYear).slice(-2);
  const number = digitsOnly(card.number);

  const res = await fetch(
    `https://api.pagar.me/core/v5/tokens?appId=${encodeURIComponent(PAGARME_PUBLIC_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'card',
        card: {
          number,
          holder_name: card.holderName.trim(),
          exp_month: Number.parseInt(expMonth, 10),
          exp_year: Number.parseInt(expYear, 10),
          cvv: digitsOnly(card.cvv),
        },
      }),
    }
  );

  const payload = (await res.json().catch(() => ({}))) as PagarmeTokenResponse;

  if (!res.ok || !payload.id) {
    const detail =
      payload.message ??
      Object.values(payload.errors ?? {})[0]?.[0] ??
      'Não foi possível validar o cartão.';
    throw new Error(detail);
  }

  return {
    token: payload.id,
    last4: number.slice(-4),
    brand: detectBrand(number),
  };
}
