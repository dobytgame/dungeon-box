import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Footer from '@/components/layout/Footer';

export default function LegalPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-stone-950 bg-grid noise">
      <div
        className="pointer-events-none absolute -right-24 top-24 h-64 w-64 rounded-full bg-ember/10 blur-[100px]"
        aria-hidden="true"
      />

      <header className="fixed left-3 right-3 top-3 z-50 mx-auto max-w-7xl rounded-sm border border-white/[0.06] bg-stone-950/90 backdrop-blur-md sm:left-4 sm:right-4 sm:top-4">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo variant="nav" />
          <Link
            href="/"
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-stone-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Voltar ao site</span>
            <span className="sm:hidden">Início</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
        {children}
      </main>

      <Footer />
    </div>
  );
}
