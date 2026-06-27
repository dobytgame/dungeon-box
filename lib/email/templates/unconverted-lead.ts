import { getSiteUrl } from '@/lib/email/config';
import {
  buildEmailHtml,
  buildEmailText,
  greetingName,
} from '@/lib/email/layout';

export const UNCONVERTED_LEAD_SUBJECT =
  'Sua dungeon ainda está esperando, Mestre ⚔️';

export interface UnconvertedLeadTemplateData {
  name?: string | null;
}

export function unconvertedLeadHtml(data: UnconvertedLeadTemplateData): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();

  return buildEmailHtml({
    subject: UNCONVERTED_LEAD_SUBJECT,
    preheader:
      'Cenários 3D modulares para RPG entregues na sua porta todo mês. Pronto para jogar no dia 1.',
    eyebrow: 'Guilda DungeonBox',
    headline: 'Sua dungeon ainda está esperando.',
    headlineAccent: 'esperando',
    paragraphs: [
      `${name}, você se cadastrou na DungeonBox mas ainda não escolheu seu plano.`,
      'Todo mês um kit de cenários 3D modulares sai da nossa forja e chega na porta do Mestre — tiles de pedra, paredes, colunas e props do sistema OpenLOCK, prontos para montar uma dungeon completa desde o primeiro unboxing.',
      'Compatível com D&D 5e, Tormenta RPG, Pathfinder e Old Dragon. As peças de hoje encaixam nas de amanhã — sua dungeon cresce todo mês, para sempre.',
    ],
    bullets: [
      '🗡️ Aventureiro — 60 peças · 3–4 salas · R$89/mês',
      '⚔️ Herói — 93 peças · 5–7 salas · R$139/mês + decoração',
      '👑 Lendário — 132 peças · 8–10 salas · R$199/mês · frete grátis + 3 minis',
    ],
    cta: { label: 'Escolher meu plano', href: `${siteUrl}/planos` },
    secondaryCta: { label: 'Ver como funciona', href: `${siteUrl}/como-funciona` },
    callout: {
      title: 'Condição de fundador ativa',
      body: 'Use o cupom FUNDADOR10 no checkout e garanta 10% de desconto no primeiro mês. Disponível por tempo limitado.',
    },
    footerNote:
      'Você recebeu este e-mail por fazer parte da comunidade DungeonBox. Para parar de receber comunicados, responda pedindo descadastro.',
  });
}

export function unconvertedLeadText(data: UnconvertedLeadTemplateData): string {
  const name = greetingName(data.name);
  const siteUrl = getSiteUrl();

  return buildEmailText([
    `${name}, você se cadastrou na DungeonBox mas ainda não escolheu seu plano.`,
    'Cenários 3D modulares para RPG entregues na sua porta todo mês. Sistema OpenLOCK. Escala 28mm. Pronto para jogar no dia 1.',
    'Planos disponíveis:',
    '🗡️ Aventureiro — 60 peças · 3–4 salas · R$89/mês',
    '⚔️ Herói — 93 peças · 5–7 salas · R$139/mês',
    '👑 Lendário — 132 peças · 8–10 salas · R$199/mês · frete grátis',
    'Cupom de fundador: FUNDADOR10 (10% off no primeiro mês)',
    `Escolha seu plano: ${siteUrl}/planos`,
    `Como funciona: ${siteUrl}/como-funciona`,
  ]);
}
