import { WHATSAPP_GUILD_URL } from '@/lib/launch/constants';

export const GUILD_WHATSAPP_URL = WHATSAPP_GUILD_URL;

/** Piso de prova social da Guilda (documento de redesign, ago/2026). */
export const GUILD_MEMBER_FLOOR = 90;

export function guildMemberCount(waitlistCount: number): number {
  return Math.max(waitlistCount, GUILD_MEMBER_FLOOR);
}

export const GUILD_HERO_IMAGES = [
  {
    src: '/images/lendario-2.png',
    width: 1200,
    height: 750,
    alt: 'Dungeon modular 3D montada na mesa — salas, corredores, portões e miniaturas em escala 28mm',
    objectPosition: 'object-[center_28%]',
  },
  {
    src: '/images/aventureiro-2.png',
    width: 1200,
    height: 750,
    alt: 'Dungeon montada com salas, corredor e props — kit DungeonBox visto de cima',
    objectPosition: 'object-top',
  },
  {
    src: '/images/lendario-3.png',
    width: 1200,
    height: 750,
    alt: 'Close da dungeon com miniatura, baú e portão — peças OpenLOCK encaixadas',
    objectPosition: 'object-center',
  },
  {
    src: '/images/heroi-2.png',
    width: 1200,
    height: 750,
    alt: 'Cenário 3D modular com portão, baús e miniaturas sobre a mesa',
    objectPosition: 'object-[center_30%]',
  },
  {
    src: '/images/dungeonbox-hero-lp.png',
    width: 600,
    height: 400,
    alt: 'Caixa DungeonBox aberta com cenários 3D, miniaturas e acessórios de RPG',
    objectPosition: 'object-center',
  },
] as const;

export const GUILD_PRODUCT_SHOTS = [
  {
    src: '/images/aventureiro-2.png',
    width: 1200,
    height: 750,
    alt: 'Dungeon montada com salas, corredor e props — kit DungeonBox visto de cima',
    caption:
      'Mês 1 + Mês 2 montados juntos. 8 salas, corredor central, área de boss.',
  },
  {
    src: '/images/lendario-3.png',
    width: 1200,
    height: 750,
    alt: 'Close da dungeon com miniatura, baú e portão — peças OpenLOCK encaixadas',
    caption:
      'Sistema OpenLOCK. Cada peça de qualquer mês encaixa em qualquer outra. Para sempre.',
  },
  {
    src: '/images/heroi-1.png',
    width: 1200,
    height: 750,
    alt: 'Peças do kit, dados e bolsa sobre a mesa de RPG',
    caption: 'É isso que seus jogadores veem quando entram na sala.',
  },
] as const;
