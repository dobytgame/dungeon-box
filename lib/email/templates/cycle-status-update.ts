import { formatCycleStatus } from '@/lib/dashboard/format';
import type { CycleStatus } from '@/lib/dashboard/types';
import { getSiteUrl } from '@/lib/email/config';
import {
  buildEmailHtml,
  buildEmailText,
  greetingName,
} from '@/lib/email/layout';

export type CycleStatusEmailContext = {
  name?: string | null;
  cycleNumber: number;
  planName?: string | null;
  themeName?: string | null;
  status: CycleStatus;
  trackingCode?: string | null;
  carrier?: string | null;
  estimatedDelivery?: string | null;
  cancelReason?: string | null;
};

type StatusCopy = {
  subject: string;
  preheader: string;
  eyebrow: string;
  headline: string;
  headlineAccent?: string;
  paragraphs: string[];
  callout?: { title: string; body: string };
  footerNote?: string;
};

function themeSuffix(themeName?: string | null): string {
  return themeName ? ` · ${themeName}` : '';
}

function planLine(planName?: string | null): string {
  return planName
    ? `Plano <strong style="color:#fff;">${planName}</strong>.`
    : '';
}

function statusCopy(ctx: CycleStatusEmailContext): StatusCopy | null {
  const name = greetingName(ctx.name);
  const cycleLabel = `ciclo ${ctx.cycleNumber}${themeSuffix(ctx.themeName)}`;
  const plan = planLine(ctx.planName);

  switch (ctx.status) {
    case 'production':
      return {
        subject: 'Seu kit entrou em produção — DungeonBox',
        preheader: `${cycleLabel} na fila da forja`,
        eyebrow: 'Produção',
        headline: 'Sua dungeon está sendo forjada.',
        headlineAccent: 'forjada',
        paragraphs: [
          `${name}, o pedido do <strong style="color:#fff;">${cycleLabel}</strong> entrou na etapa de produção.`,
          plan,
          'Nossa equipe está imprimindo e preparando as peças do seu kit. Assim que a caixa estiver pronta para embalar, você recebe outra atualização.',
        ].filter(Boolean) as string[],
        callout: {
          title: 'O que vem a seguir',
          body: 'Após a produção, montamos sua caixa e registramos o envio com código de rastreio.',
        },
      };

    case 'preparing':
      return {
        subject: 'Estamos preparando sua caixa — DungeonBox',
        preheader: `${cycleLabel} em preparo para envio`,
        eyebrow: 'Preparo',
        headline: 'Sua caixa está sendo montada.',
        headlineAccent: 'montada',
        paragraphs: [
          `${name}, o <strong style="color:#fff;">${cycleLabel}</strong> saiu da produção e está em preparo no estoque.`,
          plan,
          'Estamos conferindo peças, embalando com cuidado e preparando tudo para o despacho.',
        ].filter(Boolean) as string[],
        callout: {
          title: 'Próximo passo',
          body: 'Em breve você recebe o e-mail com o código de rastreio.',
        },
      };

    case 'shipped':
      if (!ctx.trackingCode?.trim()) return null;
      return {
        subject: 'Seu kit saiu da forja — rastreio disponível',
        preheader: `${cycleLabel} a caminho`,
        eyebrow: 'Rastreio',
        headline: 'Saiu da forja.',
        headlineAccent: 'forja',
        paragraphs: [
          `${name}, o kit do <strong style="color:#fff;">${cycleLabel}</strong> foi despachado.`,
          `Transportadora: <strong style="color:#fff;">${ctx.carrier?.trim() || 'Correios'}</strong>.`,
          `Código de rastreio: <strong style="color:#00d4ff;">${ctx.trackingCode.trim()}</strong>.`,
          ctx.estimatedDelivery
            ? `Previsão de entrega: <strong style="color:#fff;">${ctx.estimatedDelivery}</strong>.`
            : 'A previsão de entrega aparece no rastreio assim que a transportadora atualizar.',
        ],
        callout: {
          title: 'Ao receber',
          body: 'Confira as peças na embalagem. Qualquer problema, responda este e-mail em até 7 dias.',
        },
        footerNote: 'Guarde a embalagem até conferir todas as peças do ciclo.',
      };

    case 'delivered':
      return {
        subject: 'Entrega confirmada — boa aventura! · DungeonBox',
        preheader: `${cycleLabel} entregue`,
        eyebrow: 'Entrega',
        headline: 'Chegou na sua mesa.',
        headlineAccent: 'mesa',
        paragraphs: [
          `${name}, registramos a entrega do <strong style="color:#fff;">${cycleLabel}</strong>.`,
          plan,
          'Monte, pinte e convoque o grupo — sua próxima sessão está mais épica.',
        ].filter(Boolean) as string[],
        callout: {
          title: 'Precisa de ajuda?',
          body: 'Problema com peças ou embalagem? Responda este e-mail em até 7 dias após o recebimento.',
        },
      };

    case 'cancelled':
      return {
        subject: 'Atualização do seu pedido — DungeonBox',
        preheader: `${cycleLabel} cancelado`,
        eyebrow: 'Pedido',
        headline: 'Pedido cancelado.',
        paragraphs: [
          `${name}, o <strong style="color:#fff;">${cycleLabel}</strong> foi cancelado e não seguirá para envio.`,
          ctx.cancelReason
            ? `Motivo: <strong style="color:#fff;">${ctx.cancelReason}</strong>.`
            : 'Se você não solicitou este cancelamento, responda este e-mail.',
        ],
        callout: {
          title: 'Assinatura',
          body: 'Sua assinatura pode continuar ativa para os próximos ciclos. Confira o status no painel.',
        },
      };

    default:
      return null;
  }
}

export function cycleStatusUpdateSubject(ctx: CycleStatusEmailContext): string {
  return statusCopy(ctx)?.subject ?? `Atualização: ${formatCycleStatus(ctx.status)}`;
}

export function cycleStatusUpdateHtml(ctx: CycleStatusEmailContext): string {
  const copy = statusCopy(ctx);
  if (!copy) {
    return buildEmailHtml({
      subject: cycleStatusUpdateSubject(ctx),
      preheader: `Status: ${formatCycleStatus(ctx.status)}`,
      eyebrow: 'Pedido',
      headline: 'Status atualizado.',
      paragraphs: [
        `${greetingName(ctx.name)}, o ciclo ${ctx.cycleNumber} agora está em ${formatCycleStatus(ctx.status).toLowerCase()}.`,
      ],
      cta: { label: 'Ver entregas', href: `${getSiteUrl()}/dashboard/deliveries` },
    });
  }

  return buildEmailHtml({
    subject: copy.subject,
    preheader: copy.preheader,
    eyebrow: copy.eyebrow,
    headline: copy.headline,
    headlineAccent: copy.headlineAccent,
    paragraphs: copy.paragraphs,
    cta: { label: 'Ver entregas', href: `${getSiteUrl()}/dashboard/deliveries` },
    callout: copy.callout,
    footerNote: copy.footerNote,
  });
}

export function cycleStatusUpdateText(ctx: CycleStatusEmailContext): string {
  const copy = statusCopy(ctx);
  const siteUrl = getSiteUrl();
  const name = greetingName(ctx.name);
  const cycleLabel = `ciclo ${ctx.cycleNumber}${themeSuffix(ctx.themeName)}`;

  if (!copy) {
    return buildEmailText([
      `${name}, ${cycleLabel} — status: ${formatCycleStatus(ctx.status)}.`,
      `Painel: ${siteUrl}/dashboard/deliveries`,
    ]);
  }

  const lines = [`${name}, ${cycleLabel}.`, ...copy.paragraphs.map((p) => p.replace(/<[^>]+>/g, ''))];
  if (ctx.trackingCode) {
    lines.push(`Rastreio: ${ctx.trackingCode}`);
  }
  lines.push(`Painel: ${siteUrl}/dashboard/deliveries`);
  return buildEmailText(lines);
}
