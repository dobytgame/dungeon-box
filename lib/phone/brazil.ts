function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Remove prefixo Brasil (55) quando presente em números já com DDD. */
export function stripBrazilCountryCode(digits: string): string {
  if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) {
    return digits.slice(2);
  }
  return digits;
}

/**
 * Celular BR local (11 dígitos: DDD + 9 + 8 dígitos), sem código do país.
 * Aceita entrada com +55/55 e fixo de 10 dígitos (insere o 9 do celular).
 */
export function normalizeBrazilPhoneLocal(input: string): string | null {
  let digits = stripBrazilCountryCode(digitsOnly(input));

  if (digits.length === 10) {
    digits = `${digits.slice(0, 2)}9${digits.slice(2)}`;
  }

  if (digits.length !== 11) return null;

  const ddd = Number.parseInt(digits.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return null;
  if (digits[2] !== '9') return null;

  return digits;
}

export function isValidBrazilMobilePhone(input: string): boolean {
  return normalizeBrazilPhoneLocal(input) !== null;
}

export function parseBrazilPhoneForStorage(
  input: string
): { ok: true; phone: string } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: 'Informe seu telefone celular.' };
  }

  const phone = normalizeBrazilPhoneLocal(trimmed);
  if (!phone) {
    return {
      ok: false,
      error: 'Informe um celular válido com DDD, no formato (00) 00000-0000.',
    };
  }

  return { ok: true, phone };
}
