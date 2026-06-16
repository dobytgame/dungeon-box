/**
 * Calendário editorial da campanha — edite nomes, lore e ícones aqui.
 * Meses com `revealed: true` exibem conteúdo completo no card.
 */
export type CampaignMonthIcon =
  | 'ruins'
  | 'cave'
  | 'scifi'
  | 'shrine'
  | 'camp'
  | 'market'
  | 'lab'
  | 'prison'
  | 'sewer'
  | 'throne'
  | 'forest'
  | 'dragon';

export type CampaignMonth = {
  month: string;
  icon: CampaignMonthIcon;
  name: string;
  /** Texto exibido no hover / seleção dentro do card */
  lore: string;
  /** Se false, mostra teaser genérico no card */
  revealed: boolean;
};

export const campaignCalendarCopy = {
  eyebrow: 'Calendário da campanha',
  titleLine1: '12 meses ·',
  titleLine2: '12 aventuras',
  subtitle:
    'Cada mês um cenário novo para sua mesa. Passe o mouse ou toque em um mês para ver a lore — os três primeiros já estão revelados.',
  lockedLore: 'Tema surpresa. Revelado mês a mês para quem assina.',
  lockedLabel: 'Em breve',
  footerNote: 'Kit temático exclusivo · Peças modulares · Compatível com meses anteriores',
};

export const campaignMonths: CampaignMonth[] = [
  {
    month: '01',
    icon: 'ruins',
    name: 'Ruínas Perdidas',
    lore: 'Corredores de pedra rachada, portas emperradas e o primeiro sinal de que algo antigo ainda respira debaixo da mesa.',
    revealed: true,
  },
  {
    month: '02',
    icon: 'cave',
    name: 'Caverna',
    lore: 'Túneis úmidos, passagens estreitas e salões naturais. Stalactites, rios subterrâneos e ecossistema perigoso no escuro.',
    revealed: true,
  },
  {
    month: '03',
    icon: 'scifi',
    name: 'Sci-Fi',
    lore: 'Corredores metálicos, painéis holográficos e salas de comando. Dungeon futurista com grid 28mm — D&D no espaço ou one-shot cyberpunk.',
    revealed: true,
  },
  {
    month: '04',
    icon: 'shrine',
    name: 'Santuário',
    lore: campaignCalendarCopy.lockedLore,
    revealed: false,
  },
  {
    month: '05',
    icon: 'camp',
    name: 'Acampamento',
    lore: campaignCalendarCopy.lockedLore,
    revealed: false,
  },
  {
    month: '06',
    icon: 'market',
    name: 'Mercado das Sombras',
    lore: campaignCalendarCopy.lockedLore,
    revealed: false,
  },
  {
    month: '07',
    icon: 'lab',
    name: 'Laboratório',
    lore: campaignCalendarCopy.lockedLore,
    revealed: false,
  },
  {
    month: '08',
    icon: 'prison',
    name: 'Prisão',
    lore: campaignCalendarCopy.lockedLore,
    revealed: false,
  },
  {
    month: '09',
    icon: 'sewer',
    name: 'Esgotos',
    lore: campaignCalendarCopy.lockedLore,
    revealed: false,
  },
  {
    month: '10',
    icon: 'throne',
    name: 'Câmara do Rei',
    lore: campaignCalendarCopy.lockedLore,
    revealed: false,
  },
  {
    month: '11',
    icon: 'forest',
    name: 'Floresta',
    lore: campaignCalendarCopy.lockedLore,
    revealed: false,
  },
  {
    month: '12',
    icon: 'dragon',
    name: 'Covil do Dragão',
    lore: campaignCalendarCopy.lockedLore,
    revealed: false,
  },
];

/** @deprecated Use campaignMonths — mantido para imports legados */
export const themes = campaignMonths;
