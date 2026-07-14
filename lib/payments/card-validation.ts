export type CreditCardInput = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidLuhn(cardNumber: string): boolean {
  const digits = digitsOnly(cardNumber);
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number.parseInt(digits[index]!, 10);
    if (Number.isNaN(digit)) return false;

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

export function normalizeExpiryYear(value: string): string {
  const digits = digitsOnly(value);
  if (digits.length === 2) return `20${digits}`;
  if (digits.length === 4) return digits;
  throw new Error('Ano de validade inválido.');
}

export function normalizeExpiryMonth(value: string): string {
  const month = Number.parseInt(digitsOnly(value), 10);
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error('Mês de validade inválido.');
  }
  return String(month).padStart(2, '0');
}

export function isCardExpiryValid(expiryMonth: string, expiryYear: string): boolean {
  const month = Number.parseInt(normalizeExpiryMonth(expiryMonth), 10);
  const year = Number.parseInt(normalizeExpiryYear(expiryYear), 10);
  if (!Number.isFinite(month) || !Number.isFinite(year)) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  return true;
}

export function validateCreditCard(
  card: CreditCardInput
): { ok: true; normalized: CreditCardInput } | { ok: false; error: string } {
  const holderName = card.holderName.trim();
  const number = digitsOnly(card.number);
  const ccv = digitsOnly(card.ccv);

  if (holderName.length < 2) {
    return { ok: false, error: 'Informe o nome impresso no cartão.' };
  }

  if (number.length < 13 || number.length > 19) {
    return { ok: false, error: 'Número do cartão inválido.' };
  }

  if (!isValidLuhn(number)) {
    return { ok: false, error: 'Número do cartão inválido.' };
  }

  let expiryMonth: string;
  let expiryYear: string;

  try {
    expiryMonth = normalizeExpiryMonth(card.expiryMonth);
    expiryYear = normalizeExpiryYear(card.expiryYear);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : 'Validade do cartão inválida.',
    };
  }

  if (!isCardExpiryValid(expiryMonth, expiryYear)) {
    return { ok: false, error: 'Cartão vencido. Use outro cartão.' };
  }

  if (ccv.length < 3 || ccv.length > 4) {
    return { ok: false, error: 'CVV inválido.' };
  }

  return {
    ok: true,
    normalized: {
      holderName,
      number,
      expiryMonth,
      expiryYear,
      ccv,
    },
  };
}
