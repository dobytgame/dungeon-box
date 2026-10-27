import { buildWhatsAppChatUrl } from '@/lib/whatsapp/chat';

export function guildSupportWhatsAppUrl(planName?: string): string {
  let message = 'Olá! Quero conhecer os cenários da DungeonBox.';
  if (planName?.trim()) {
    message += ` Estou olhando o plano ${planName.trim()}.`;
  }
  return buildWhatsAppChatUrl(message);
}
