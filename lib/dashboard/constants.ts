export const PIECE_COLORS = [
  { value: 'cinza-pedra', label: 'Cinza pedra', hex: '#6b7280' },
  { value: 'preto', label: 'Preto', hex: '#1a1a1a' },
  { value: 'marrom-terra', label: 'Marrom terra', hex: '#6b4423' },
  { value: 'verde-musgo', label: 'Verde musgo', hex: '#3d5c3a' },
  { value: 'azul-ardosia', label: 'Azul ardósia', hex: '#4a5568' },
  { value: 'vermelho-rubi', label: 'Vermelho rubi', hex: '#9b2c2c' },
] as const;

export const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export const DASHBOARD_NAV_GROUP_ORDER = ['caixa', 'loja', 'mesa', 'conta'] as const;

export type DashboardNavGroupId = (typeof DASHBOARD_NAV_GROUP_ORDER)[number];

export const DASHBOARD_NAV = [
  {
    href: '/dashboard',
    label: 'Visão geral',
    icon: 'home',
    group: 'caixa',
    eyebrow: 'Minha conta',
    description: 'Status da assinatura, próxima entrega e fidelidade num só lugar.',
  },
  {
    href: '/dashboard/subscription',
    label: 'Assinatura',
    icon: 'subscription',
    group: 'caixa',
    eyebrow: 'Sua caixa',
    description: 'Plano, cobrança, cores escolhidas e gerenciamento da assinatura.',
  },
  {
    href: '/dashboard/deliveries',
    label: 'Entregas',
    icon: 'package',
    group: 'caixa',
    eyebrow: 'Na estrada',
    description:
      'Produção, embalagem, coleta da Loggi, rastreio e histórico das caixas.',
  },
  {
    href: '/dashboard/votacao',
    label: 'Votação',
    icon: 'star',
    group: 'caixa',
    eyebrow: 'Próxima caixa',
    description:
      'Dois temas na mesa. Aberto, o seu voto. Encerrado, o vencedor e a porcentagem dos votos válidos.',
  },
  {
    href: '/dashboard/pedidos',
    label: 'Pedidos',
    icon: 'package',
    group: 'loja',
    eyebrow: 'Loja',
    description:
      'Compras da loja e kits extras de pintura, com produção, embalagem, coleta e envio.',
  },
  {
    href: '/dashboard/feedback',
    label: 'Avaliar',
    icon: 'star',
    group: 'mesa',
    eyebrow: 'Sua opinião',
    description: 'Nota com estrelas e fotos das entregas já recebidas.',
  },
  {
    href: '/dashboard/aventura',
    label: 'Aventura',
    icon: 'camera',
    group: 'mesa',
    eyebrow: 'Sua mesa',
    description:
      'Envie fotos da mesa em uso. Se a equipe aprovar, o brinde segue no próximo kit.',
  },
  {
    href: '/loja',
    label: 'Loja',
    icon: 'shop',
    group: 'loja',
    eyebrow: 'Extras',
    description: 'Kits de pintura e acessórios para complementar sua dungeon.',
  },
  {
    href: '/dashboard/payments',
    label: 'Pagamentos',
    icon: 'payment',
    group: 'loja',
    eyebrow: 'Cofre',
    description: 'Histórico de cobranças, troca de cartão da assinatura e detalhes de cada pagamento.',
  },
  {
    href: '/dashboard/profile',
    label: 'Perfil',
    icon: 'user',
    group: 'conta',
    eyebrow: 'Aventureiro',
    description: 'Dados pessoais, contato e preferências das peças.',
  },
  {
    href: '/dashboard/addresses',
    label: 'Endereços',
    icon: 'map',
    group: 'conta',
    eyebrow: 'Destino',
    description: 'Onde sua dungeon chega todo mês.',
  },
  {
    href: '/dashboard/loyalty',
    label: 'Fidelidade',
    icon: 'star',
    group: 'mesa',
    eyebrow: 'Recompensas',
    description: 'Níveis, bônus e benefícios por permanência na assinatura.',
  },
] as const;

export const REFERRAL_NAV_ITEM = {
  href: '/dashboard/indique',
  label: 'Indique e Ganhe',
  icon: 'gift',
  group: 'mesa',
  eyebrow: 'Indicações',
  description: 'Compartilhe seu link, acumule pontos e resgate recompensas da loja.',
} as const;

export type DashboardNavItem = (typeof DASHBOARD_NAV)[number] | typeof REFERRAL_NAV_ITEM;

export function buildDashboardNav(
  showReferral: boolean,
  showStore = true,
  showThemeVote = true
): DashboardNavItem[] {
  let items: DashboardNavItem[] = showStore
    ? [...DASHBOARD_NAV]
    : DASHBOARD_NAV.filter((item) => item.href !== '/loja');

  if (!showThemeVote) {
    items = items.filter((item) => item.href !== '/dashboard/votacao');
  }

  if (showReferral) {
    items = [...items, REFERRAL_NAV_ITEM];
  }

  return items;
}

export function isDashboardNavActive(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
}
