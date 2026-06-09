import type { Metadata } from 'next';
import { Bebas_Neue, DM_Sans } from 'next/font/google';
import AuthRecoveryRedirect from '@/components/auth/AuthRecoveryRedirect';
import CookieConsentRoot from '@/components/legal/CookieConsentRoot';
import './globals.css';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dungeonbox.com.br'),
  title: 'DungeonBox — Cenários RPG 3D na sua porta todo mês',
  description:
    'Assinatura mensal de cenários 3D modulares para RPG e boardgame. Cada caixa expande sua dungeon. Compatível com D&D, Pathfinder, Tormenta e mais.',
  keywords: [
    'dungeon tiles',
    'RPG',
    'cenários 3D',
    'assinatura',
    'boardgame',
    'impressão 3D',
    'D&D',
  ],
  openGraph: {
    title: 'DungeonBox — Sua dungeon cresce todo mês',
    description: 'Cenários 3D modulares impressos e entregues mensalmente.',
    images: ['/images/img-hero-dungeonbox.png'],
    type: 'website',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${bebasNeue.variable} ${dmSans.variable}`}>
      <body className="bg-stone-950 font-body text-white antialiased">
        <CookieConsentRoot>
          <AuthRecoveryRedirect />
          {children}
        </CookieConsentRoot>
      </body>
    </html>
  );
}
