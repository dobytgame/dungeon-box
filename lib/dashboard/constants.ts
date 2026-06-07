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

export const DASHBOARD_NAV = [
  {
    href: '/dashboard',
    label: 'Visão geral',
    icon: 'home',
    eyebrow: 'Minha conta',
    description: 'Status da assinatura, próxima entrega e fidelidade num só lugar.',
  },
  {
    href: '/dashboard/subscription',
    label: 'Assinatura',
    icon: 'subscription',
    eyebrow: 'Sua caixa',
    description: 'Plano, cobrança, cores escolhidas e gerenciamento da assinatura.',
  },
  {
    href: '/dashboard/deliveries',
    label: 'Entregas',
    icon: 'package',
    eyebrow: 'Na estrada',
    description: 'Ciclos mensais, temas, rastreio e histórico de envios.',
  },
  {
    href: '/dashboard/payments',
    label: 'Pagamentos',
    icon: 'payment',
    eyebrow: 'Cofre',
    description: 'Histórico de cobranças e detalhes de cada pagamento.',
  },
  {
    href: '/dashboard/profile',
    label: 'Perfil',
    icon: 'user',
    eyebrow: 'Aventureiro',
    description: 'Dados pessoais, contato e preferências das peças.',
  },
  {
    href: '/dashboard/addresses',
    label: 'Endereços',
    icon: 'map',
    eyebrow: 'Destino',
    description: 'Onde sua dungeon chega todo mês.',
  },
  {
    href: '/dashboard/loyalty',
    label: 'Fidelidade',
    icon: 'star',
    eyebrow: 'Recompensas',
    description: 'Níveis, bônus e benefícios por permanência na assinatura.',
  },
] as const;
