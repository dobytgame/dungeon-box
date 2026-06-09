import type { Metadata } from 'next';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = privatePageMetadata('Assinatura confirmada');

export default function CheckoutSuccessPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-950 bg-grid noise">
      <div
        className="pointer-events-none absolute -right-24 top-32 h-72 w-72 rounded-full bg-ember/15 blur-[100px]"
        aria-hidden="true"
      />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
        <Logo variant="nav" />
        <p className="mt-10 font-display text-xs uppercase tracking-[0.3em] text-frost">
          Bem-vindo à guilda
        </p>
        <h1 className="mt-3 font-display text-4xl uppercase tracking-wide text-white">
          Assinatura ativa
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-400">
          Sua primeira dungeon está a caminho. Acompanhe entregas, pagamentos e
          fidelidade no painel da conta.
        </p>
        <Link
          href="/dashboard"
          className="mt-10 inline-flex cursor-pointer rounded-sm bg-ember px-8 py-3.5 font-display text-sm uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
        >
          Ir para minha conta
        </Link>
      </main>
    </div>
  );
}
