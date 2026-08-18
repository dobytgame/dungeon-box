import { Cinzel, Sora } from 'next/font/google';
import './guild-lp.css';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-guild-display',
  display: 'swap',
  preload: true,
});

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-guild-body',
  display: 'swap',
});

export default function GuildLpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${cinzel.variable} ${sora.variable} guild-lp font-sora`}>
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-relic-gold focus:px-4 focus:py-3 focus:font-sora focus:text-sm focus:font-semibold focus:text-relic-ink"
      >
        Pular para o conteúdo
      </a>
      {children}
    </div>
  );
}
