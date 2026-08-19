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
  cycleId?: string | null;
  cycleNumber: number;
  planName?: string | null;
  themeName?: string | null;
  status: CycleStatus;
  trackingCode?: string | null;
  carrier?: string | null;
  estimatedDelivery?: string | null;
  cancelReason?: string | null;
};

function feedbackHref(cycleId?: string | null): string {
  const base = `${getSiteUrl()}/dashboard/feedback`;
  return cycleId ? `${base}?cycle=${cycleId}` : base;
}

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
        subject: 'Seu pedido entrou em produção — DungeonBox',
        preheader: `${cycleLabel} — impressão e preparo das peças`,
        eyebrow: 'Produção',
        headline: 'Começamos a forjar seu kit.',
        headlineAccent: 'forjar',
        paragraphs: [
          `${name}, boa notícia: o <strong style="color:#fff;">${cycleLabel}</strong> entrou em <strong style="color:#fff;">produção</strong>.`,
          plan,
          'Neste momento estamos imprimindo e preparando as miniaturas do seu pedido — incluindo itens adicionais da loja, quando houver.',
          'Assim que tudo estiver pronto para embalar, avisamos que sua caixa entrou em preparo.',
        ].filter(Boolean) as string[],
        callout: {
          title: 'Próximas etapas',
          body: 'Produção → preparo → embalado → coleta → envio com rastreio.',
        },
      };

    case 'preparing':
      return {
        subject: 'Sua caixa está sendo preparada — DungeonBox',
        preheader: `${cycleLabel} em preparo para despacho`,
        eyebrow: 'Em preparo',
        headline: 'Estamos montando sua caixa.',
        headlineAccent: 'montando',
        paragraphs: [
          `${name}, o <strong style="color:#fff;">${cycleLabel}</strong> saiu da produção e já está <strong style="color:#fff;">em preparo</strong> no nosso estoque.`,
          plan,
          'Conferimos peças, separamos add-ons e preparamos tudo para embalar.',
          'O próximo aviso chega quando a caixa estiver fechada.',
        ].filter(Boolean) as string[],
        callout: {
          title: 'Próximas etapas',
          body: 'Preparo → embalado → fila de coleta → envio com rastreio.',
        },
      };

    case 'packed':
      return {
        subject: 'Sua caixa foi embalada — DungeonBox',
        preheader: `${cycleLabel} conferido e fechado`,
        eyebrow: 'Embalado',
        headline: 'Caixa fechada.',
        headlineAccent: 'fechada',
        paragraphs: [
          `${name}, o <strong style="color:#fff;">${cycleLabel}</strong> foi conferido e <strong style="color:#fff;">embalado</strong>.`,
          plan,
          'Peças, add-ons e o plano certo estão dentro. A caixa já está selada.',
          'Em seguida ela entra na fila de coleta da transportadora. O rastreio chega no despacho.',
        ].filter(Boolean) as string[],
        callout: {
          title: 'Fique de olho',
          body: 'O próximo e-mail avisa quando sua caixa estiver aguardando a coleta.',
        },
      };

    case 'awaiting_pickup':
      return {
        subject: 'Sua caixa aguarda a coleta — DungeonBox',
        preheader: `${cycleLabel} na fila da Loggi`,
        eyebrow: 'Aguardando coleta',
        headline: 'Na fila da Loggi.',
        headlineAccent: 'Loggi',
        paragraphs: [
          `${name}, o <strong style="color:#fff;">${cycleLabel}</strong> está <strong style="color:#fff;">aguardando a coleta</strong> da transportadora.`,
          plan,
          'A etiqueta já está pronta. Assim que a Loggi coletar o pacote, você recebe o código de rastreio.',
        ].filter(Boolean) as string[],
        callout: {
          title: 'Rastreio',
          body: 'O código sai no próximo e-mail, no momento do despacho — não antes.',
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
          `Transportadora: <strong style="color:#fff;">${ctx.carrier?.trim() || 'Loggi'}</strong>.`,
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
        preheader: `${cycleLabel} entregue — avalie com estrelas`,
        eyebrow: 'Entrega',
        headline: 'Chegou na sua mesa.',
        headlineAccent: 'mesa',
        paragraphs: [
          `${name}, registramos a entrega do <strong style="color:#fff;">${cycleLabel}</strong>.`,
          plan,
          'Monte, pinte e convoque o grupo — sua próxima sessão está mais épica.',
          'Quando puder, deixe uma nota com estrelas e, se quiser, envie fotos da mesa. Sua opinião guia a próxima forja.',
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

  const deliveriesHref = `${getSiteUrl()}/dashboard/deliveries`;
  const deliveredCta =
    ctx.status === 'delivered'
      ? {
          cta: {
            label: 'Avaliar minha caixa',
            href: feedbackHref(ctx.cycleId),
          },
          secondaryCta: { label: 'Ver entregas', href: deliveriesHref },
        }
      : { cta: { label: 'Ver entregas', href: deliveriesHref } };

  return buildEmailHtml({
    subject: copy.subject,
    preheader: copy.preheader,
    eyebrow: copy.eyebrow,
    headline: copy.headline,
    headlineAccent: copy.headlineAccent,
    paragraphs: copy.paragraphs,
    ...deliveredCta,
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
  if (ctx.status === 'delivered') {
    lines.push(`Avaliar: ${feedbackHref(ctx.cycleId)}`);
  }
  lines.push(`Painel: ${siteUrl}/dashboard/deliveries`);
  return buildEmailText(lines);
}
