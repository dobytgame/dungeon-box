import { COMPANY } from '@/lib/legal/constants';
import { WHATSAPP_GUILD_URL } from '@/lib/launch/constants';
import { getSiteUrl } from '@/lib/email/config';

const COLORS = {
  bg: '#09090b',
  card: '#1c1917',
  border: 'rgba(255,255,255,0.08)',
  text: '#e7e5e4',
  muted: '#a8a29e',
  ember: '#ff6b2b',
  emberBright: '#ff9060',
  frost: '#00d4ff',
};

export const NEWSLETTER_WELCOME_SUBJECT =
  'Bem-vindo à Guilda, Mestre — DungeonBox';

export function newsletterWelcomeText(): string {
  return `Você está na lista.

Nos próximos dias você vai receber:
- Os bastidores da produção do Kit Mês 1
- Os planos e preços antes de todo mundo
- A oferta exclusiva de fundador

Grupo da Guilda (WhatsApp): ${WHATSAPP_GUILD_URL}

Uma coisa antes de ir: qual sistema você joga? (D&D, Tormenta, Pathfinder, outro?)
Responda este e-mail — ajuda muito a calibrar os primeiros kits.

Até breve,
Equipe ${COMPANY.brand}

---
${COMPANY.siteUrl}
Privacidade: ${COMPANY.privacyEmail}
`;
}

export function newsletterWelcomeHtml(): string {
  const siteUrl = getSiteUrl();
  const logoUrl = `${siteUrl}/images/dungeonbox.png`;
  const privacyUrl = `${siteUrl}/privacidade`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>${NEWSLETTER_WELCOME_SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.bg};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Você entrou na Crônica do Mestre. Bastidores, planos e oferta de fundador em breve.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${COLORS.bg};">
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
            <td style="background-color:${COLORS.card};border:1px solid ${COLORS.border};border-radius:4px;overflow:hidden;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,${COLORS.ember},${COLORS.frost});font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:32px 28px 8px;">
                    <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:${COLORS.frost};font-weight:600;">
                      Crônica do Mestre
                    </p>
                    <h1 style="margin:0 0 20px;font-size:28px;line-height:1.15;font-weight:800;text-transform:uppercase;letter-spacing:0.02em;color:#ffffff;font-family:Impact,'Arial Black',sans-serif;">
                      Bem-vindo à<br />
                      <span style="color:${COLORS.ember};">Guilda</span>, Mestre.
                    </h1>
                    <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:${COLORS.text};">
                      Você está na lista. Nos próximos dias, este e-mail vai trazer o que ainda não está no Instagram:
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 8px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid ${COLORS.border};">
                      <tr>
                        <td style="padding:20px 0 12px;font-size:15px;line-height:1.6;color:${COLORS.text};">
                          <span style="color:${COLORS.ember};font-weight:700;">→</span> Bastidores da produção do Kit Mês 1
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 12px;font-size:15px;line-height:1.6;color:${COLORS.text};">
                          <span style="color:${COLORS.ember};font-weight:700;">→</span> Planos e preços antes de todo mundo
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 20px;font-size:15px;line-height:1.6;color:${COLORS.text};">
                          <span style="color:${COLORS.ember};font-weight:700;">→</span> Oferta exclusiva de fundador
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 28px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 16px;">
                      <tr>
                        <td style="border-radius:4px;background-color:${COLORS.ember};">
                          <a href="${WHATSAPP_GUILD_URL}" style="display:inline-block;padding:14px 28px;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;color:#09090b;">
                            Entrar no Grupo da Guilda
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0 0 16px;font-size:14px;line-height:1.65;color:${COLORS.muted};text-align:center;">
                      Prefere acompanhar por aqui? Fique de olho na caixa de entrada.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:rgba(255,107,43,0.08);border-left:3px solid ${COLORS.ember};border-radius:0 4px 4px 0;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.emberBright};">
                            Uma pergunta rápida
                          </p>
                          <p style="margin:0;font-size:15px;line-height:1.6;color:${COLORS.text};">
                            Qual sistema você joga? <strong style="color:#fff;">D&amp;D</strong>, <strong style="color:#fff;">Tormenta</strong>, <strong style="color:#fff;">Pathfinder</strong> ou outro?
                            Responda este e-mail — ajuda a calibrar os primeiros kits.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 8px 0;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:${COLORS.muted};">
                Até breve,<br />
                <strong style="color:${COLORS.text};">Equipe ${COMPANY.brand}</strong>
              </p>
              <p style="margin:16px 0 0;font-size:11px;line-height:1.6;color:#78716c;">
                Você recebeu este e-mail porque se cadastrou na newsletter em
                <a href="${siteUrl}" style="color:${COLORS.frost};text-decoration:none;">${siteUrl.replace(/^https?:\/\//, '')}</a>.
                <br />
                <a href="${privacyUrl}" style="color:#78716c;text-decoration:underline;">Política de privacidade</a>
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
