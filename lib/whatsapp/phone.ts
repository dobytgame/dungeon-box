import { digitsOnly } from '@/lib/masks';

/** Normaliza celular BR para E.164 (ex.: 5511965671180). */
export function normalizeBrazilPhoneE164(phone: string): string | null {
  const digits = digitsOnly(phone);
  if (digits.length < 10 || digits.length > 11) return null;

  const local =
    digits.length === 11
      ? digits
      : digits.length === 10
        ? `${digits.slice(0, 2)}9${digits.slice(2)}`
        : null;

  if (!local || local.length !== 11) return null;
  return `55${local}`;
}
