import { COMPANY } from '@/lib/legal/constants';
import { getSiteUrl } from '@/lib/email/config';

export const EMAIL_COLORS = {
  bg: '#09090b',
  card: '#1c1917',
  border: 'rgba(255,255,255,0.08)',
  text: '#e7e5e4',
  muted: '#a8a29e',
  ember: '#ff6b2b',
  emberBright: '#ff9060',
  frost: '#00d4ff',
} as const;

export interface EmailCta {
  label: string;
  href: string;
}

export interface EmailCallout {
  title: string;
  body: string;
}

export interface EmailLayoutOptions {
  subject: string;
  preheader: string;
  eyebrow: string;
  headline: string;
  headlineAccent?: string;
  paragraphs: string[];
  bullets?: string[];
  cta?: EmailCta;
  secondaryCta?: EmailCta;
  callout?: EmailCallout;
  footerNote?: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderParagraphs(paragraphs: string[]): string {
  return paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:${EMAIL_COLORS.text};">${p}</p>`,
    )
    .join('');
}

function renderBullets(bullets: string[]): string {
  if (!bullets.length) return '';
  const rows = bullets
    .map(
      (item) => `
      <tr>
        <td style="padding:0 0 12px;font-size:15px;line-height:1.6;color:${EMAIL_COLORS.text};">
          <span style="color:${EMAIL_COLORS.ember};font-weight:700;">→</span> ${item}
        </td>
      </tr>`,
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid ${EMAIL_COLORS.border};margin:8px 0 20px;">
      ${rows}
    </table>`;
}

function renderCta(cta: EmailCta, primary = true): string {
  if (primary) {
    return `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 12px;">
        <tr>
          <td style="border-radius:4px;background-color:${EMAIL_COLORS.ember};">
            <a href="${escapeHtml(cta.href)}" style="display:inline-block;padding:14px 28px;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;color:#09090b;">
              ${escapeHtml(cta.label)}
            </a>
          </td>
        </tr>
      </table>`;
  }

  return `
    <p style="margin:0 0 20px;text-align:center;">
      <a href="${escapeHtml(cta.href)}" style="font-size:14px;color:${EMAIL_COLORS.frost};text-decoration:underline;">
        ${escapeHtml(cta.label)}
      </a>
    </p>`;
}

function renderCallout(callout: EmailCallout): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:rgba(255,107,43,0.08);border-left:3px solid ${EMAIL_COLORS.ember};border-radius:0 4px 4px 0;margin-top:8px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_COLORS.emberBright};">
            ${escapeHtml(callout.title)}
          </p>
          <p style="margin:0;font-size:15px;line-height:1.6;color:${EMAIL_COLORS.text};">
            ${callout.body}
          </p>
        </td>
      </tr>
    </table>`;
}

function buildHeadlineHtml(headline: string, accent?: string): string {
  if (!accent) {
    return escapeHtml(headline);
  }

  const index = headline.indexOf(accent);
  if (index === -1) {
    return escapeHtml(headline);
  }

  const before = escapeHtml(headline.slice(0, index));
  const after = escapeHtml(headline.slice(index + accent.length));
  const accentHtml = `<span style="color:${EMAIL_COLORS.ember};">${escapeHtml(accent)}</span>`;

  return `${before}${accentHtml}${after}`;
}

export function buildEmailHtml(options: EmailLayoutOptions): string {
  const siteUrl = getSiteUrl();
  const logoUrl = `${siteUrl}/images/dungeonbox.png`;
  const privacyUrl = `${siteUrl}/privacidade`;
  const headlineHtml = buildHeadlineHtml(options.headline, options.headlineAccent);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>${escapeHtml(options.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL_COLORS.bg};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(options.preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${EMAIL_COLORS.bg};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
          <tr>
            <td style="padding-bottom:28px;text-align:center;">
              <a href="${siteUrl}" style="text-decoration:none;">
                <img src="${logoUrl}" alt="DungeonBox" width="180" style="display:block;margin:0 auto;border:0;max-width:180px;height:auto;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="background-color:${EMAIL_COLORS.card};border:1px solid ${EMAIL_COLORS.border};border-radius:4px;overflow:hidden;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,${EMAIL_COLORS.ember},${EMAIL_COLORS.frost});font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:32px 28px 8px;">
                    <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:${EMAIL_COLORS.frost};font-weight:600;">
                      ${escapeHtml(options.eyebrow)}
                    </p>
                    <h1 style="margin:0 0 20px;font-size:28px;line-height:1.15;font-weight:800;text-transform:uppercase;letter-spacing:0.02em;color:#ffffff;font-family:Impact,'Arial Black',sans-serif;">
                      ${headlineHtml}
                    </h1>
                    ${renderParagraphs(options.paragraphs)}
                  </td>
                </tr>
                ${options.bullets?.length ? `<tr><td style="padding:0 28px;">${renderBullets(options.bullets)}</td></tr>` : ''}
                <tr>
                  <td style="padding:8px 28px 28px;">
                    ${options.cta ? renderCta(options.cta, true) : ''}
                    ${options.secondaryCta ? renderCta(options.secondaryCta, false) : ''}
                    ${options.callout ? renderCallout(options.callout) : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 8px 0;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:${EMAIL_COLORS.muted};">
                Até breve,<br />
                <strong style="color:${EMAIL_COLORS.text};">Equipe ${COMPANY.brand}</strong>
              </p>
              ${options.footerNote ? `<p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:${EMAIL_COLORS.muted};">${options.footerNote}</p>` : ''}
              <p style="margin:16px 0 0;font-size:11px;line-height:1.6;color:#78716c;">
                <a href="${siteUrl}" style="color:${EMAIL_COLORS.frost};text-decoration:none;">${siteUrl.replace(/^https?:\/\//, '')}</a>
                · <a href="${privacyUrl}" style="color:#78716c;text-decoration:underline;">Privacidade</a>
                · ${COMPANY.privacyEmail}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildEmailText(blocks: string[]): string {
  const siteUrl = getSiteUrl();
  return `${blocks.join('\n\n')}

---
${COMPANY.brand}
${siteUrl}
Privacidade: ${COMPANY.privacyEmail}`;
}

export function formatCurrencyBrl(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function greetingName(name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed || 'Mestre';
}
