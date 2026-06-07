import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import type { CheckoutData } from '@/lib/checkout/types';
import type { Address } from '@/lib/dashboard/types';
import CheckoutProgress from './CheckoutProgress';
import CheckoutSummary from './CheckoutSummary';

interface Props {
  step: number;
  data: CheckoutData;
  addresses: Address[];
  children: React.ReactNode;
}

export default function CheckoutShell({ step, data, addresses, children }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-950 bg-grid noise">
      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-frost/5 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-ember/10 blur-[100px]"
        aria-hidden="true"
      />

      <header className="fixed left-4 right-4 top-4 z-50 mx-auto max-w-6xl">
        <div className="flex items-center justify-between rounded-sm border border-white/10 bg-stone-950/90 px-5 py-3 backdrop-blur-md">
          <Logo variant="nav" />
          <Link
            href="/"
            className="cursor-pointer text-xs uppercase tracking-widest text-stone-500 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
          >
            Voltar ao site
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="max-w-2xl lg:max-w-none">
          <p className="font-display text-xs uppercase tracking-[0.35em] text-frost">
            Assinatura
          </p>
          <h1 className="mt-2 font-display text-3xl uppercase tracking-wide text-white md:text-4xl lg:text-[2.75rem]">
            Finalizar pedido
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-500">
            Escolha seu plano, confirme a entrega e ative sua assinatura mensal.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="order-2 min-w-0 lg:order-1">
            <div className="rounded-sm border border-white/[0.06] bg-stone-950/40 p-5 backdrop-blur-sm md:p-8">
              <CheckoutProgress step={step} />
              {children}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <CheckoutSummary data={data} step={step} addresses={addresses} />
          </div>
        </div>
      </main>
    </div>
  );
}
