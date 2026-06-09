import { COMPANY } from '@/lib/legal/constants';

/**
 * Remetentes por função — todos no domínio verificado no Resend.
 *
 * EMAIL_FROM_MARKETING   → taverna@   (newsletter, campanhas)
 * EMAIL_FROM_GUILD       → guilda@    (conta, compra, assinatura)
 * EMAIL_FROM_BILLING     → tesouro@   (financeiro, cancelamento)
 * EMAIL_FROM_SUPPORT     → mestre@    (suporte e contato)
 * EMAIL_FROM_SHIPPING    → rastreio@  (pedidos despachados)
 * EMAIL_FROM_PRODUCTION  → forja@     (bastidores / produção)
 *
 * EMAIL_FROM_NEWSLETTER  → alias legado de marketing
 * EMAIL_FROM             → fallback global
 */
export type EmailSenderRole =
  | 'marketing'
  | 'guild'
  | 'billing'
  | 'support'
  | 'shipping'
  | 'production'
  | 'newsletter';

const ROLE_ENV: Record<EmailSenderRole, string> = {
  marketing: 'EMAIL_FROM_MARKETING',
  guild: 'EMAIL_FROM_GUILD',
  billing: 'EMAIL_FROM_BILLING',
  support: 'EMAIL_FROM_SUPPORT',
  shipping: 'EMAIL_FROM_SHIPPING',
  production: 'EMAIL_FROM_PRODUCTION',
  newsletter: 'EMAIL_FROM_NEWSLETTER',
};

const ROLE_DISPLAY_NAME: Record<EmailSenderRole, string> = {
  marketing: 'DungeonBox · Taverna',
  guild: 'DungeonBox · Guilda',
  billing: 'DungeonBox · Tesouro',
  support: 'DungeonBox · Mestre',
  shipping: 'DungeonBox · Rastreio',
  production: 'DungeonBox · Forja',
  newsletter: 'DungeonBox · Crônica do Mestre',
};

const ROLE_ALIASES: Partial<Record<EmailSenderRole, EmailSenderRole[]>> = {
  newsletter: ['marketing'],
  marketing: ['newsletter'],
};

function formatFromAddress(address: string, displayName: string): string {
  if (address.includes('<')) {
    return address;
  }
  return `${displayName} <${address}>`;
}

function resolveRawAddress(role: EmailSenderRole): string | null {
  const roleAddress = process.env[ROLE_ENV[role]]?.trim();
  if (roleAddress) return roleAddress;

  const aliases = ROLE_ALIASES[role] ?? [];
  for (const alias of aliases) {
    const aliasAddress = process.env[ROLE_ENV[alias]]?.trim();
    if (aliasAddress) return aliasAddress;
  }

  return process.env.EMAIL_FROM?.trim() ?? null;
}

export function isEmailConfigured(role?: EmailSenderRole): boolean {
  if (!process.env.RESEND_API_KEY?.trim()) {
    return false;
  }
  if (role) {
    return Boolean(resolveRawAddress(role));
  }
  return Boolean(process.env.EMAIL_FROM?.trim());
}

export function getEmailFrom(role: EmailSenderRole = 'guild'): string {
  const address = resolveRawAddress(role);
  if (!address) {
    throw new Error(`Remetente não configurado (${ROLE_ENV[role]} ou EMAIL_FROM).`);
  }

  const usesRoleSpecific = Boolean(process.env[ROLE_ENV[role]]?.trim());
  const displayName = usesRoleSpecific
    ? ROLE_DISPLAY_NAME[role]
    : 'DungeonBox';

  return formatFromAddress(address, displayName);
}

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    COMPANY.siteUrl.replace(/\/$/, '')
  );
}

/** Endereço bruto do papel (sem nome de exibição). */
export function getRoleEmailAddress(role: EmailSenderRole): string | null {
  const raw = resolveRawAddress(role);
  if (!raw) return null;
  const match = raw.match(/<([^>]+)>/);
  return match ? match[1] : raw;
}
