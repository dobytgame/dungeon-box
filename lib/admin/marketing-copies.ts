import type { MarketingCopyPreset } from '@/lib/admin/types';

export const MARKETING_COPY_PRESETS: MarketingCopyPreset[] = [
  {
    id: 'novo-tema',
    label: 'Reveal do tema do mês',
    subject: 'O tema deste mês acaba de ser revelado — DungeonBox',
    title: 'Uma nova dungeon aguarda sua mesa.',
    body: `Mestre, a forja abriu as portas e o tema deste mês já está disponível no painel.

Prepare a mesa, convoque o grupo e garanta que seu endereço de entrega está atualizado para não perder o envio.

Dúvidas? Responda este e-mail — lemos pessoalmente.`,
    ctaLabel: 'Ver no painel',
    ctaHref: '/dashboard',
  },
  {
    id: 'combo-promo',
    label: 'Combo antecipado',
    subject: 'Antecipe meses e economize no seu plano — DungeonBox',
    title: 'Pague menos antecipando sua aventura.',
    body: `Agora você pode assinar pacotes combo de 3, 6 ou 12 meses com desconto exclusivo.

Combo 3 meses: 10% OFF
Combo 6 meses: 15% OFF
Combo 12 meses: 1 mês grátis

Parcelamento em até 12x no cartão — até 4x sem juros (Lendário 6/12 meses: até 6x sem juros). Disponível para um plano por vez no checkout.`,
    ctaLabel: 'Ver planos combo',
    ctaHref: '/#planos',
  },
  {
    id: 'indique-ganhe',
    label: 'Indique e Ganhe',
    subject: 'Indique amigos e ganhe recompensas — DungeonBox',
    title: 'Sua mesa cresce, seus pontos também.',
    body: `Assinantes ativos já podem participar do Indique e Ganhe.

Compartilhe seu código exclusivo, ajude novos mestres a entrar na Guilda e acumule pontos para resgatar tintas, peças avulsas e até meses de plano.

Acesse o painel, copie seu link e comece a indicar hoje.`,
    ctaLabel: 'Abrir Indique e Ganhe',
    ctaHref: '/dashboard/indique',
  },
  {
    id: 'atraso-pagamento',
    label: 'Lembrete de pagamento',
    subject: 'Ação necessária: regularize sua assinatura — DungeonBox',
    title: 'Sua aventura está pausada.',
    body: `Identificamos um problema com a cobrança da sua assinatura DungeonBox.

Para continuar recebendo suas caixas mensais sem interrupção, acesse o painel e atualize a forma de pagamento o quanto antes.

Se já regularizou, desconsidere este aviso — a confirmação pode levar algumas horas.`,
    ctaLabel: 'Regularizar assinatura',
    ctaHref: '/dashboard/subscription',
  },
  {
    id: 'novidade-loja',
    label: 'Novidades da loja',
    subject: 'Peças avulsas e novidades na loja — DungeonBox',
    title: 'Expanda seu cenário além da caixa.',
    body: `A loja da Guilda recebeu novidades: peças avulsas, cenários complementares e itens exclusivos para assinantes.

Entre com sua conta para ver descontos de fidelidade aplicados automaticamente no carrinho.`,
    ctaLabel: 'Visitar loja',
    ctaHref: '/loja',
  },
  {
    id: 'lead-nao-convertido',
    label: 'Lead não convertido',
    subject: 'Sua dungeon ainda está esperando, Mestre ⚔️',
    title: 'Sua dungeon ainda está esperando.',
    body: 'Campanha estruturada para usuários cadastrados sem plano ativo. Inclui planos, cupom FUNDADOR10 e CTAs para /#planos e /como-funciona. O nome do destinatário é personalizado automaticamente.',
    template: 'unconverted_lead',
    defaultAudience: 'inactive_users',
  },
];
