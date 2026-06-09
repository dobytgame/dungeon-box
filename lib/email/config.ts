import { COMPANY } from '@/lib/legal/constants';

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export function getEmailFrom(): string {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) {
    throw new Error('EMAIL_FROM não configurado.');
  }
  return from.includes('<') ? from : `DungeonBox <${from}>`;
}

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    COMPANY.siteUrl.replace(/\/$/, '')
  );
}
