import { Barlow_Condensed, Manrope } from 'next/font/google';

export const mesaDisplayFont = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-home-display',
  display: 'swap',
});

export const mesaBodyFont = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-home-body',
  display: 'swap',
});

export const mesaFontVariables = `${mesaDisplayFont.variable} ${mesaBodyFont.variable}`;
