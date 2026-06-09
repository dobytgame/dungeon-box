import type { Metadata } from 'next';
import { Bebas_Neue, DM_Sans } from 'next/font/google';
import GoogleTagManager from '@/components/analytics/GoogleTagManager';
import AuthRecoveryRedirect from '@/components/auth/AuthRecoveryRedirect';
import CookieConsentRoot from '@/components/legal/CookieConsentRoot';
import {
  buildOpenGraph,
  buildRobots,
  buildTwitterCard,
} from '@/lib/seo/metadata';
import {
  FAVICON_PATH,
  SEO_KEYWORDS,
  SITE_NAME,
  SITE_TAGLINE,
  getCanonicalSiteUrl,
} from '@/lib/seo/site';
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
  metadataBase: new URL(getCanonicalSiteUrl()),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_TAGLINE,
  keywords: [...SEO_KEYWORDS],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: getCanonicalSiteUrl() }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: buildRobots(true),
  openGraph: buildOpenGraph({
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description:
      'Cenários 3D modulares impressos e entregues mensalmente. Sistema OpenLOCK, escala 28mm.',
    path: '/',
  }),
  twitter: buildTwitterCard({
    title: `${SITE_NAME} — Cenários 3D para RPG`,
    description: SITE_TAGLINE,
  }),
  icons: {
    icon: FAVICON_PATH,
    shortcut: FAVICON_PATH,
    apple: FAVICON_PATH,
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
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
          <GoogleTagManager />
          <AuthRecoveryRedirect />
          {children}
        </CookieConsentRoot>
      </body>
    </html>
  );
}
