import { COMPANY } from '@/lib/legal/constants';
import { digitsOnly } from '@/lib/masks';

export function buildWhatsAppChatUrl(
  message: string,
  phoneE164: string = COMPANY.whatsappE164
): string {
  const digits = digitsOnly(phoneE164);
  const text = encodeURIComponent(message.trim());
  return `https://wa.me/${digits}?text=${text}`;
}

export function buildWhatsAppLeadMessage(input: {
  name: string;
  email: string;
  phoneDisplay: string;
  pagePath?: string | null;
}): string {
  const lines = [
    `Olá! Meu nome é ${input.name.trim()}.`,
    `E-mail: ${input.email.trim()}`,
    `WhatsApp: ${input.phoneDisplay.trim()}`,
    'Gostaria de conversar sobre a DungeonBox.',
  ];

  if (input.pagePath?.trim()) {
    lines.push(`Página: ${input.pagePath.trim()}`);
  }

  return lines.join('\n');
}
