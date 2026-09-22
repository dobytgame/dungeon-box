import { Barlow_Condensed, Manrope } from 'next/font/google';
import { requireAdmin } from '@/lib/admin/auth';
import { homeV2PreviewMetadata } from '@/lib/seo/metadata';
import './home-v2.css';

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-home-display',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-home-body',
  display: 'swap',
});

export const metadata = homeV2PreviewMetadata;

export default async function HomeV2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin({ next: '/home-v2' });

  return (
    <div className={`${barlowCondensed.variable} ${manrope.variable} home-v2 font-homeBody`}>
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:bg-mesa-ember focus:px-4 focus:py-3 focus:font-homeBody focus:text-sm focus:font-semibold focus:text-mesa-ink"
      >
        Pular para o conteúdo
      </a>
      {children}
    </div>
  );
}
