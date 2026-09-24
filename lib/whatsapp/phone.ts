import { normalizeBrazilPhoneLocal } from '@/lib/phone/brazil';

/** Normaliza celular BR para E.164 (ex.: 5511999999999). */
export function normalizeBrazilPhoneE164(phone: string): string | null {
  const local = normalizeBrazilPhoneLocal(phone);
  if (!local) return null;
  return `55${local}`;
}
