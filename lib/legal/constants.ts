/** Versão dos documentos legais — incrementar ao publicar alterações relevantes. */
export const LEGAL_DOCUMENT_VERSION = '1.0';

export const LEGAL_LAST_UPDATED = '6 de junho de 2026';

export const COMPANY = {
  brand: 'DungeonBox',
  legalName: 'DungeonBox',
  cnpj: process.env.NEXT_PUBLIC_COMPANY_CNPJ ?? '57.205.373/0001-16',
  address:
    'R. Leila Gonçalves, 449 - Vila Goncalves, São Bernardo do Campo - SP',
  whatsappE164: '5511965671180',
  whatsappDisplay: '(11) 96567-1180',
  whatsappUrl: 'https://wa.me/5511965671180',
  instagramUrl: 'https://www.instagram.com/dungeon.box/',
  instagramHandle: '@dungeon.box',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dungeonbox.com.br',
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? 'privacidade@dungeonbox.com.br',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'mestre@dungeonbox.com.br',
} as const;
