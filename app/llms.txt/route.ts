import { launchFaqItems } from '@/lib/launch/data';
import { getCanonicalSiteUrl, SITE_NAME, SITE_TAGLINE } from '@/lib/seo/site';

export function GET() {
  const siteUrl = getCanonicalSiteUrl();
  const faqBlock = launchFaqItems
    .map((item) => `Q: ${item.q}\nA: ${item.a}`)
    .join('\n\n');

  const body = `# ${SITE_NAME}

> ${SITE_TAGLINE}

## O que é
${SITE_NAME} é a primeira assinatura mensal de cenários 3D modulares para RPG do Brasil. Todo mês um kit com tiles, paredes e props chega na porta do assinante. Sistema OpenLOCK, escala 28mm. Compatível com D&D 5e, Tormenta RPG, Pathfinder, Old Dragon e qualquer sistema com grid 28mm.

## Planos
- Aventureiro: 56 peças, 3–4 salas
- Herói: 86 peças, 5–7 salas (mais popular)
- Lendário: 122 peças, 8–10 salas, inclui miniaturas

## Links
- Site: ${siteUrl}
- Política de privacidade: ${siteUrl}/privacidade
- Termos de uso: ${siteUrl}/termos

## Perguntas frequentes
${faqBlock}
`;

  return new Response(body.trim(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
