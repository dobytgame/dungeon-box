import type { LoyaltyAccent } from './data';

export type LoyaltyTheme = {
  accentBar: string;
  nameClass: string;
  checkClass: string;
  nodeActive: string;
  nodeIdle: string;
  specBg: string;
  watermark: string;
  glow: string;
};

const themes: Record<LoyaltyAccent, LoyaltyTheme> = {
  silver: {
    accentBar: 'border-l-silver',
    nameClass: 'text-silver',
    checkClass: 'text-silver',
    nodeActive: 'border-silver bg-silver/15 text-silver shadow-[0_0_24px_rgba(160,170,187,0.25)]',
    nodeIdle: 'border-stone-600 bg-stone-950 text-stone-500 group-hover:border-stone-400 group-hover:text-stone-300',
    specBg: 'from-silver/8',
    watermark: 'text-silver',
    glow: 'bg-silver/10',
  },
  ember: {
    accentBar: 'border-l-ember',
    nameClass: 'text-gradient-ember',
    checkClass: 'text-ember',
    nodeActive: 'border-ember bg-ember/15 text-ember shadow-[0_0_28px_rgba(255,107,43,0.35)]',
    nodeIdle: 'border-stone-600 bg-stone-950 text-stone-500 group-hover:border-ember/40 group-hover:text-stone-300',
    specBg: 'from-ember/10',
    watermark: 'text-ember',
    glow: 'bg-ember/12',
  },
  frost: {
    accentBar: 'border-l-frost',
    nameClass: 'text-gradient-frost',
    checkClass: 'text-frost',
    nodeActive: 'border-frost bg-frost/15 text-frost shadow-[0_0_28px_rgba(0,212,255,0.3)]',
    nodeIdle: 'border-stone-600 bg-stone-950 text-stone-500 group-hover:border-frost/40 group-hover:text-stone-300',
    specBg: 'from-frost/10',
    watermark: 'text-frost',
    glow: 'bg-frost/10',
  },
  gold: {
    accentBar: 'border-l-gold',
    nameClass: 'text-gold',
    checkClass: 'text-gold',
    nodeActive: 'border-gold bg-gold/15 text-gold shadow-[0_0_28px_rgba(255,214,0,0.3)]',
    nodeIdle: 'border-stone-600 bg-stone-950 text-stone-500 group-hover:border-gold/40 group-hover:text-stone-300',
    specBg: 'from-gold/10',
    watermark: 'text-gold',
    glow: 'bg-gold/10',
  },
};

export function getLoyaltyTheme(accent: LoyaltyAccent): LoyaltyTheme {
  return themes[accent];
}
