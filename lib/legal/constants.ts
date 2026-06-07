/** Versão dos documentos legais — incrementar ao publicar alterações relevantes. */
export const LEGAL_DOCUMENT_VERSION = '1.0';

export const LEGAL_LAST_UPDATED = '6 de junho de 2026';

export const COMPANY = {
  brand: 'DungeonBox',
  legalName: 'DungeonBox',
  /** Substituir quando o CNPJ estiver definido. */
  cnpj: process.env.NEXT_PUBLIC_COMPANY_CNPJ ?? null,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dungeonbox.com.br',
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? 'privacidade@dungeonbox.com.br',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'suporte@dungeonbox.com.br',
} as const;
