'use client';

import Link from 'next/link';
import { CreditCard, Lock, ShieldCheck } from 'lucide-react';
import { MP_CONFIGURED } from '@/lib/mercadopago';
import CheckoutSection from './CheckoutSection';

interface Props {
  onBack: () => void;
}

export default function StepPayment({ onBack }: Props) {
  return (
    <div className="space-y-8">
      <CheckoutSection
        title="Pagamento"
        subtitle="Cobrança mensal automática. Você pode cancelar a qualquer momento."
      >
        <div className="rounded-sm border border-white/[0.06] bg-stone-950/40 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-stone-950">
              <CreditCard className="h-5 w-5 text-stone-400" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">Mercado Pago</p>
              <p className="mt-1 text-sm leading-relaxed text-stone-500">
                {MP_CONFIGURED
                  ? 'Cartão de crédito com renovação automática mensal.'
                  : 'Integração em andamento. O resumo ao lado já reflete seu pedido.'}
              </p>
            </div>
          </div>

          <div
            className="mt-5 flex min-h-[120px] items-center justify-center rounded-sm border border-dashed border-white/10 bg-stone-950/50 px-4 py-8 text-center"
            aria-hidden={!MP_CONFIGURED}
          >
            {MP_CONFIGURED ? (
              <p className="text-sm text-stone-500">
                Brick de pagamento será renderizado aqui.
              </p>
            ) : (
              <p className="max-w-xs text-xs leading-relaxed text-stone-600">
                Configure <code className="text-stone-500">MP_ACCESS_TOKEN</code> para
                ativar o formulário de cartão nesta etapa.
              </p>
            )}
          </div>
        </div>
      </CheckoutSection>

      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-stone-600">
        <li className="flex items-center gap-1.5">
          <Lock className="h-3 w-3" aria-hidden="true" />
          Pagamento seguro
        </li>
        <li className="flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          Cancele quando quiser
        </li>
      </ul>

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer rounded-sm border border-white/15 px-5 py-3 font-display text-xs uppercase tracking-widest text-stone-400 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        >
          Voltar
        </button>
        <Link
          href="/dashboard"
          className="flex flex-1 cursor-pointer items-center justify-center rounded-sm bg-ember py-3.5 font-display text-sm uppercase tracking-widest text-stone-950 transition-colors duration-200 hover:bg-ember-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        >
          Ir para minha conta
        </Link>
      </div>
    </div>
  );
}
